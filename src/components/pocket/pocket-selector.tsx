"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_POCKETS } from "@/lib/graphql/queries";
import { CREATE_POCKET } from "@/lib/graphql/mutations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Pocket {
  id: string;
  name: string;
  currentBalance: number;
  isDefault: boolean;
  icon: string | null;
}

interface PocketsData {
  pockets: Pocket[];
}

interface PocketSelectorProps {
  value?: string;
  onChange: (pocketId: string) => void;
  className?: string;
}

export function PocketSelector({ value, onChange, className }: PocketSelectorProps) {
  const { data, refetch } = useQuery<PocketsData>(GET_POCKETS);
  const pockets = data?.pockets || [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPocketName, setNewPocketName] = useState("");

  const [createPocket, { loading: creating }] = useMutation<{ createPocket: Pocket }>(CREATE_POCKET, {
    onCompleted: (data) => {
      const newPocket = data.createPocket;
      toast.success("Pocket berhasil dibuat");
      setIsCreateOpen(false);
      setNewPocketName("");
      refetch().then(() => {
        onChange(newPocket.id);
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPocketName.trim()) {
      toast.error("Nama pocket tidak boleh kosong");
      return;
    }
    createPocket({
      variables: { input: { name: newPocketName.trim() } },
    });
  };

  // Auto-select default pocket if no value set
  if (!value && pockets.length > 0) {
    const defaultPocket = pockets.find((p) => p.isDefault) || pockets[0];
    // Use setTimeout to avoid setState during render
    setTimeout(() => onChange(defaultPocket.id), 0);
  }

  const selectedPocket = pockets.find((p) => p.id === value);

  return (
    <>
      <Select
        value={value}
        onValueChange={(val) => {
          if (val === "__create__") {
            setIsCreateOpen(true);
            return;
          }
          onChange(val);
        }}
      >
        <SelectTrigger className={className}>
          {selectedPocket ? (
            <span className="flex items-center truncate">
              <span className="mr-2">{selectedPocket.icon || "💰"}</span>
              {selectedPocket.name}
            </span>
          ) : (
            <>
              <span className="mr-2">💰</span>
              <SelectValue placeholder="Pilih Pocket" />
            </>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__create__" className="text-primary font-medium">
            <span className="flex items-center gap-2">
              <Plus className="h-3 w-3" />
              Buat pocket baru
            </span>
          </SelectItem>
          {pockets.map((pocket) => (
            <SelectItem key={pocket.id} value={pocket.id}>
              {pocket.icon ? `${pocket.icon} ` : "💰 "}{pocket.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Pocket Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Pocket</Label>
              <Input
                value={newPocketName}
                onChange={(e) => setNewPocketName(e.target.value)}
                placeholder="Contoh: Tabungan, Dana Darurat"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
