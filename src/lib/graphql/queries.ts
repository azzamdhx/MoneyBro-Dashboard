import { gql } from "@apollo/client/core";

export const GET_DASHBOARD = gql`
  query GetDashboard {
    dashboard {
      totalActiveDebt
      totalActiveInstallment
      totalExpenseThisMonth
      totalIncomeThisMonth
      totalSavingsContributionThisMonth
      balanceSummary {
        totalIncome
        totalExpense
        totalInstallmentPayment
        totalDebtPayment
        netBalance
        status
      }
      expensesByCategory {
        category {
          id
          name
        }
        totalAmount
        expenseCount
      }
      activeSavingsGoals {
        id
        name
        targetAmount
        currentAmount
        targetDate
        icon
        status
        progress
        remainingAmount
        monthlyTarget
      }
      recentExpenses {
        id
        itemName
        total
        expenseDate
        category {
          name
        }
      }
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      profileImage
      twoFAEnabled
      notifyInstallment
      notifyDebt
      notifySavingsGoal
      notifyDaysBefore
      createdAt
      updatedAt
    }
  }
`;

export const CHECK_EMAIL_AVAILABILITY = gql`
  query CheckEmailAvailability($email: String!) {
    checkEmailAvailability(email: $email)
  }
`;

export const GET_EXPENSES = gql`
  query GetExpenses($filter: ExpenseFilter) {
    expenses(filter: $filter) {
      items {
        id
        itemName
        unitPrice
        quantity
        total
        notes
        expenseDate
        createdAt
        category {
          id
          name
        }
      }
      summary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      expenseCount
      totalSpent
    }
  }
`;

export const GET_INSTALLMENTS = gql`
  query GetInstallments($status: InstallmentStatus) {
    installments(status: $status) {
      id
      name
      actualAmount
      loanAmount
      monthlyPayment
      tenor
      paidCount
      startDate
      dueDay
      status
      notes
      createdAt
      interestAmount
      interestPercentage
      remainingPayments
      remainingAmount
      payments {
        id
        paymentNumber
        amount
        paidAt
      }
    }
  }
`;

export const GET_DEBTS = gql`
  query GetDebts($status: DebtStatus) {
    debts(status: $status) {
      id
      personName
      actualAmount
      loanAmount
      paymentType
      monthlyPayment
      tenor
      dueDate
      status
      notes
      createdAt
      totalToPay
      paidAmount
      remainingAmount
      interestAmount
      interestPercentage
      payments {
        id
        amount
        paidAt
      }
    }
  }
`;

export const GET_INCOME_CATEGORIES = gql`
  query GetIncomeCategories {
    incomeCategories {
      id
      name
      createdAt
    }
  }
`;

export const GET_INCOMES = gql`
  query GetIncomes($filter: IncomeFilter) {
    incomes(filter: $filter) {
      items {
        id
        sourceName
        amount
        incomeType
        incomeDate
        isRecurring
        notes
        createdAt
        category {
          id
          name
        }
      }
      summary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
        byType {
          incomeType
          totalAmount
          count
        }
      }
    }
  }
`;

export const GET_RECURRING_INCOMES = gql`
  query GetRecurringIncomes($isActive: Boolean) {
    recurringIncomes(isActive: $isActive) {
      id
      sourceName
      amount
      incomeType
      recurringDay
      isActive
      notes
      createdAt
      category {
        id
        name
      }
    }
  }
`;

export const GET_EXPENSE_TEMPLATE_GROUPS = gql`
  query GetExpenseTemplateGroups {
    expenseTemplateGroups {
      id
      name
      recurringDay
      notes
      total
      createdAt
      items {
        id
        itemName
        unitPrice
        quantity
        total
        category {
          id
          name
        }
      }
    }
  }
`;

export const GET_BALANCE = gql`
  query GetBalance($filter: BalanceFilterInput!) {
    balance(filter: $filter) {
      periodLabel
      startDate
      endDate
      income {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          incomeCount
        }
        byType {
          incomeType
          totalAmount
          incomeCount
        }
      }
      expense {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          expenseCount
        }
      }
      installment {
        total
        count
      }
      debt {
        total
        count
      }
      netBalance
      status
    }
  }
`;

export const GET_UPCOMING_PAYMENTS = gql`
  query GetUpcomingPayments($filter: UpcomingPaymentsFilter!) {
    upcomingPayments(filter: $filter) {
      installments {
        installmentId
        name
        monthlyPayment
        dueDay
        dueDate
        remainingAmount
        remainingPayments
      }
      debts {
        debtId
        personName
        monthlyPayment
        dueDate
        remainingAmount
        paymentType
      }
      totalInstallment
      totalDebt
      totalPayments
    }
  }
`;

export const GET_SAVINGS_GOALS = gql`
  query GetSavingsGoals($status: SavingsGoalStatus) {
    savingsGoals(status: $status) {
      id
      name
      targetAmount
      currentAmount
      targetDate
      icon
      status
      notes
      progress
      remainingAmount
      monthlyTarget
      createdAt
      contributions {
        id
        amount
        contributionDate
        notes
        createdAt
      }
    }
  }
`;

export const GET_ACTUAL_PAYMENTS = gql`
  query GetActualPayments($filter: ActualPaymentsFilter!) {
    actualPayments(filter: $filter) {
      installments {
        installmentId
        name
        amount
        transactionDate
        description
      }
      debts {
        debtId
        personName
        amount
        transactionDate
        description
      }
      totalInstallment
      totalDebt
      totalPayments
    }
  }
`;

export const GET_HISTORY_SUMMARY = gql`
  query GetHistorySummary($filter: MonthYearInput) {
    historySummary(filter: $filter) {
      availableMonths
      selectedMonth
      incomeSummary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
        byType {
          incomeType
          totalAmount
          count
        }
      }
      expenseSummary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
      }
      payments {
        installments {
          installmentId
          name
          amount
          transactionDate
          description
        }
        debts {
          debtId
          personName
          amount
          transactionDate
          description
        }
        totalInstallment
        totalDebt
        totalPayments
      }
      totalSavingsContribution
    }
  }
`;

export const GET_FORECAST_SUMMARY = gql`
  query GetForecastSummary($filter: MonthYearInput) {
    forecastSummary(filter: $filter) {
      availableMonths
      selectedMonth
      incomeSummary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
        byType {
          incomeType
          totalAmount
          count
        }
      }
      expenseSummary {
        total
        count
        byCategory {
          category {
            id
            name
          }
          totalAmount
          count
        }
      }
      payments {
        installments {
          installmentId
          name
          monthlyPayment
          dueDay
          dueDate
          remainingAmount
          remainingPayments
        }
        debts {
          debtId
          personName
          monthlyPayment
          dueDate
          remainingAmount
          paymentType
        }
        totalInstallment
        totalDebt
        totalPayments
      }
      totalSavingsContribution
    }
  }
`;
