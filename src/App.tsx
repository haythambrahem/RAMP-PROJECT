import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { InputSelect } from "./components/InputSelect";
import { Instructions } from "./components/Instructions";
import { Transactions } from "./components/Transactions";
import { useEmployees } from "./hooks/useEmployees";
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions";
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee";
import { EMPTY_EMPLOYEE } from "./utils/constants";
import { Employee } from "./utils/types";

export function App() {
  const {
    data: employees,
    loading: employeesLoading,
    ...employeeUtils
  } = useEmployees();
  const {
    data: paginatedTransactions,
    loading: paginatedTransactionsLoading,
    fetchAll: fetchPaginatedTransactions,
    invalidateData: invalidatePaginatedTransactions,
  } = usePaginatedTransactions();
  const {
    data: transactionsByEmployee,
    loading: transactionsByEmployeeLoading,
    fetchById: fetchTransactionsByEmployee,
    invalidateData: invalidateTransactionsByEmployee,
  } = useTransactionsByEmployee();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    EMPTY_EMPLOYEE
  );
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);

  useEffect(() => {
    if (paginatedTransactions && paginatedTransactions.nextPage === null) {
      setHasMoreTransactions(false);
    }
  }, [paginatedTransactions]);

  const transactions = useMemo(() => {
    return selectedEmployee === EMPTY_EMPLOYEE
      ? allTransactions.length > 0
        ? allTransactions
        : paginatedTransactions?.data ?? null
      : transactionsByEmployee ?? null;
  }, [
    selectedEmployee,
    allTransactions,
    paginatedTransactions,
    transactionsByEmployee,
  ]);

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true);
    setSelectedEmployee(EMPTY_EMPLOYEE);
    invalidateTransactionsByEmployee();

    await employeeUtils.fetchAll();
    await fetchPaginatedTransactions();

    setAllTransactions(paginatedTransactions?.data ?? []);

    setIsLoading(false);
  }, [
    employeeUtils,
    fetchPaginatedTransactions,
    invalidateTransactionsByEmployee,
    paginatedTransactions,
  ]);

  const loadMoreTransactions = useCallback(async () => {
    setIsLoading(true);

    await fetchPaginatedTransactions();

    if (paginatedTransactions && paginatedTransactions.nextPage === null) {
      setHasMoreTransactions(false);
    }

    setAllTransactions((prevTransactions) => [
      ...prevTransactions,
      ...(paginatedTransactions?.data ?? []),
    ]);

    setIsLoading(false);
  }, [fetchPaginatedTransactions, paginatedTransactions]);

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      if (employeeId === EMPTY_EMPLOYEE.id) {
        await loadAllTransactions();
      } else {
        setSelectedEmployee(
          employees?.find((emp) => emp.id === employeeId) ?? null
        );
        invalidatePaginatedTransactions();
        await fetchTransactionsByEmployee(employeeId);
      }
    },
    [
      employees,
      fetchTransactionsByEmployee,
      invalidatePaginatedTransactions,
      loadAllTransactions,
    ]
  );

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions();
    }
  }, [employees, employeeUtils.loading, loadAllTransactions]);

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeesLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return;
            }

            await loadTransactionsByEmployee(newValue.id);
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {selectedEmployee === EMPTY_EMPLOYEE && hasMoreTransactions && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsLoading}
              onClick={async () => {
                await loadMoreTransactions();
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  );
}
