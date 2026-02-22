import { gql } from "@apollo/client/core";

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
      itemName
      unitPrice
      quantity
      total
      notes
      expenseDate
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: UUID!, $input: UpdateExpenseInput!) {
    updateExpense(id: $id, input: $input) {
      id
      itemName
      unitPrice
      quantity
      total
      notes
      expenseDate
      category {
        id
        name
      }
    }
  }
`;

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($id: UUID!) {
    deleteExpense(id: $id)
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: UUID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: UUID!) {
    deleteCategory(id: $id)
  }
`;

export const CREATE_INSTALLMENT = gql`
  mutation CreateInstallment($input: CreateInstallmentInput!) {
    createInstallment(input: $input) {
      id
      name
      actualAmount
      loanAmount
      monthlyPayment
      tenor
      startDate
      dueDay
      status
    }
  }
`;

export const UPDATE_INSTALLMENT = gql`
  mutation UpdateInstallment($id: UUID!, $input: UpdateInstallmentInput!) {
    updateInstallment(id: $id, input: $input) {
      id
      name
      actualAmount
      loanAmount
      monthlyPayment
      tenor
      startDate
      dueDay
      status
    }
  }
`;

export const DELETE_INSTALLMENT = gql`
  mutation DeleteInstallment($id: UUID!) {
    deleteInstallment(id: $id)
  }
`;

export const RECORD_INSTALLMENT_PAYMENT = gql`
  mutation RecordInstallmentPayment($input: RecordInstallmentPaymentInput!) {
    recordInstallmentPayment(input: $input) {
      id
      paymentNumber
      amount
      paidAt
    }
  }
`;

export const CREATE_DEBT = gql`
  mutation CreateDebt($input: CreateDebtInput!) {
    createDebt(input: $input) {
      id
      personName
      actualAmount
      loanAmount
      paymentType
      monthlyPayment
      tenor
      dueDate
      status
    }
  }
`;

export const UPDATE_DEBT = gql`
  mutation UpdateDebt($id: UUID!, $input: UpdateDebtInput!) {
    updateDebt(id: $id, input: $input) {
      id
      personName
      actualAmount
      loanAmount
      paymentType
      monthlyPayment
      tenor
      dueDate
      status
    }
  }
`;

export const DELETE_DEBT = gql`
  mutation DeleteDebt($id: UUID!) {
    deleteDebt(id: $id)
  }
`;

export const RECORD_DEBT_PAYMENT = gql`
  mutation RecordDebtPayment($input: RecordDebtPaymentInput!) {
    recordDebtPayment(input: $input) {
      id
      paymentNumber
      amount
      paidAt
    }
  }
`;

export const MARK_INSTALLMENT_COMPLETE = gql`
  mutation MarkInstallmentComplete($id: UUID!) {
    markInstallmentComplete(id: $id) {
      id
      status
    }
  }
`;

export const MARK_DEBT_COMPLETE = gql`
  mutation MarkDebtComplete($id: UUID!) {
    markDebtComplete(id: $id) {
      id
      status
    }
  }
`;

export const CREATE_INCOME_CATEGORY = gql`
  mutation CreateIncomeCategory($input: CreateIncomeCategoryInput!) {
    createIncomeCategory(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_INCOME_CATEGORY = gql`
  mutation UpdateIncomeCategory($id: UUID!, $input: UpdateIncomeCategoryInput!) {
    updateIncomeCategory(id: $id, input: $input) {
      id
      name
    }
  }
`;

export const DELETE_INCOME_CATEGORY = gql`
  mutation DeleteIncomeCategory($id: UUID!) {
    deleteIncomeCategory(id: $id)
  }
`;

export const CREATE_INCOME = gql`
  mutation CreateIncome($input: CreateIncomeInput!) {
    createIncome(input: $input) {
      id
      sourceName
      amount
      incomeType
      incomeDate
      isRecurring
      notes
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_INCOME = gql`
  mutation UpdateIncome($id: UUID!, $input: UpdateIncomeInput!) {
    updateIncome(id: $id, input: $input) {
      id
      sourceName
      amount
      incomeType
      incomeDate
      isRecurring
      notes
      category {
        id
        name
      }
    }
  }
`;

export const DELETE_INCOME = gql`
  mutation DeleteIncome($id: UUID!) {
    deleteIncome(id: $id)
  }
`;

export const CREATE_RECURRING_INCOME = gql`
  mutation CreateRecurringIncome($input: CreateRecurringIncomeInput!) {
    createRecurringIncome(input: $input) {
      id
      sourceName
      amount
      incomeType
      recurringDay
      isActive
      notes
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_RECURRING_INCOME = gql`
  mutation UpdateRecurringIncome($id: UUID!, $input: UpdateRecurringIncomeInput!) {
    updateRecurringIncome(id: $id, input: $input) {
      id
      sourceName
      amount
      incomeType
      recurringDay
      isActive
      notes
      category {
        id
        name
      }
    }
  }
`;

export const DELETE_RECURRING_INCOME = gql`
  mutation DeleteRecurringIncome($id: UUID!) {
    deleteRecurringIncome(id: $id)
  }
`;

export const CREATE_INCOME_FROM_RECURRING = gql`
  mutation CreateIncomeFromRecurring($recurringId: UUID!, $incomeDate: Date) {
    createIncomeFromRecurring(recurringId: $recurringId, incomeDate: $incomeDate) {
      id
      sourceName
      amount
      incomeType
      incomeDate
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      name
      profileImage
      createdAt
      updatedAt
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input)
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

export const VERIFY_2FA = gql`
  mutation Verify2FA($input: Verify2FAInput!) {
    verify2FA(input: $input) {
      token
      refreshToken
      user {
        id
        email
        name
        profileImage
        twoFAEnabled
      }
    }
  }
`;

export const RESEND_2FA_CODE = gql`
  mutation Resend2FACode($tempToken: String!) {
    resend2FACode(tempToken: $tempToken)
  }
`;

export const ENABLE_2FA = gql`
  mutation Enable2FA($password: String!) {
    enable2FA(password: $password)
  }
`;

export const DISABLE_2FA = gql`
  mutation Disable2FA($password: String!) {
    disable2FA(password: $password)
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($input: DeleteAccountInput!) {
    deleteAccount(input: $input)
  }
`;

export const CREATE_EXPENSE_TEMPLATE_GROUP = gql`
  mutation CreateExpenseTemplateGroup($input: CreateExpenseTemplateGroupInput!) {
    createExpenseTemplateGroup(input: $input) {
      id
      name
      recurringDay
      notes
      total
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

export const UPDATE_EXPENSE_TEMPLATE_GROUP = gql`
  mutation UpdateExpenseTemplateGroup($id: UUID!, $input: UpdateExpenseTemplateGroupInput!) {
    updateExpenseTemplateGroup(id: $id, input: $input) {
      id
      name
      recurringDay
      notes
      total
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

export const DELETE_EXPENSE_TEMPLATE_GROUP = gql`
  mutation DeleteExpenseTemplateGroup($id: UUID!) {
    deleteExpenseTemplateGroup(id: $id)
  }
`;

export const ADD_EXPENSE_TEMPLATE_ITEM = gql`
  mutation AddExpenseTemplateItem($groupId: UUID!, $input: CreateExpenseTemplateItemInput!) {
    addExpenseTemplateItem(groupId: $groupId, input: $input) {
      id
      name
      total
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

export const UPDATE_EXPENSE_TEMPLATE_ITEM = gql`
  mutation UpdateExpenseTemplateItem($itemId: UUID!, $input: UpdateExpenseTemplateItemInput!) {
    updateExpenseTemplateItem(itemId: $itemId, input: $input) {
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
`;

export const DELETE_EXPENSE_TEMPLATE_ITEM = gql`
  mutation DeleteExpenseTemplateItem($itemId: UUID!) {
    deleteExpenseTemplateItem(itemId: $itemId)
  }
`;

export const CREATE_SAVINGS_GOAL = gql`
  mutation CreateSavingsGoal($input: CreateSavingsGoalInput!) {
    createSavingsGoal(input: $input) {
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
  }
`;

export const UPDATE_SAVINGS_GOAL = gql`
  mutation UpdateSavingsGoal($id: UUID!, $input: UpdateSavingsGoalInput!) {
    updateSavingsGoal(id: $id, input: $input) {
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
  }
`;

export const DELETE_SAVINGS_GOAL = gql`
  mutation DeleteSavingsGoal($id: UUID!) {
    deleteSavingsGoal(id: $id)
  }
`;

export const ADD_SAVINGS_CONTRIBUTION = gql`
  mutation AddSavingsContribution($input: AddSavingsContributionInput!) {
    addSavingsContribution(input: $input) {
      id
      amount
      contributionDate
      notes
    }
  }
`;

export const WITHDRAW_SAVINGS_CONTRIBUTION = gql`
  mutation WithdrawSavingsContribution($id: UUID!) {
    withdrawSavingsContribution(id: $id)
  }
`;

export const MARK_SAVINGS_GOAL_COMPLETE = gql`
  mutation MarkSavingsGoalComplete($id: UUID!) {
    markSavingsGoalComplete(id: $id) {
      id
      status
    }
  }
`;

export const CREATE_EXPENSES_FROM_TEMPLATE_GROUP = gql`
  mutation CreateExpensesFromTemplateGroup($groupId: UUID!, $expenseDate: Date) {
    createExpensesFromTemplateGroup(groupId: $groupId, expenseDate: $expenseDate) {
      id
      itemName
      unitPrice
      quantity
      total
      expenseDate
      category {
        id
        name
      }
    }
  }
`;
