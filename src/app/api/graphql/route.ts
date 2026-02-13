import { NextRequest, NextResponse } from "next/server";
import { redis, getCacheTTL, getInvalidationKeys, buildCacheKey } from "@/lib/redis";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!;

function extractOperationName(body: { operationName?: string; query?: string }): string | null {
  if (body.operationName) return body.operationName;
  if (body.query) {
    const match = body.query.match(/(?:query|mutation)\s+(\w+)/);
    return match ? match[1] : null;
  }
  return null;
}

function extractUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_id || payload.sub || null;
  } catch {
    return null;
  }
}

function isMutation(body: { query?: string }): boolean {
  return body.query?.trimStart().startsWith("mutation") ?? false;
}

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const userId = extractUserIdFromToken(authHeader);

  let body: { operationName?: string; query?: string; variables?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [{ message: "Invalid JSON" }] }, { status: 400 });
  }

  const operationName = extractOperationName(body);

  // For queries (not mutations), try Redis cache first
  if (operationName && userId && !isMutation(body)) {
    const ttl = getCacheTTL(operationName);
    if (ttl !== null) {
      try {
        const cacheKey = buildCacheKey(userId, operationName, body.variables);
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          const data = typeof cached === "string" ? JSON.parse(cached) : cached;
          return NextResponse.json(data, {
            headers: { "x-cache": "HIT" },
          });
        }
      } catch {
        // Redis error — fall through to backend
      }
    }
  }

  // Forward request to backend
  const backendResponse = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });

  const responseData = await backendResponse.json();

  // Only cache successful query responses
  if (operationName && userId && !isMutation(body) && !responseData.errors) {
    const ttl = getCacheTTL(operationName);
    if (ttl !== null) {
      try {
        const cacheKey = buildCacheKey(userId, operationName, body.variables);
        redis.set(cacheKey, JSON.stringify(responseData), { ex: ttl });
      } catch {
        // Redis error — ignore
      }
    }
  }

  // On mutations, invalidate related caches
  if (operationName && userId && isMutation(body) && !responseData.errors) {
    const keysToInvalidate = getInvalidationKeys(operationName);
    if (keysToInvalidate.length > 0) {
      try {
        const pattern = `gql:${userId}:*`;
        redis.keys(pattern).then((allKeys) => {
          const toDelete = allKeys.filter((key) =>
            keysToInvalidate.some((queryName) => key.includes(`:${queryName}`))
          );
          if (toDelete.length > 0) {
            Promise.all(toDelete.map((key) => redis.del(key)));
          }
        });
      } catch {
        // Redis error — ignore
      }
    }
  }

  return NextResponse.json(responseData, {
    status: backendResponse.status,
    headers: { "x-cache": "MISS" },
  });
}
