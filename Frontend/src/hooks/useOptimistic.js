/**
 * Custom hook for optimistic UI updates
 * Allows instant UI feedback while API calls complete in the background
 * Automatically rolls back on failure
 */
import { useState, useCallback } from 'react';

/**
 * @template T
 * @param {T} initialState - The initial state value
 * @returns {[T, (newValue: T, apiCall: () => Promise<any>) => Promise<void>, boolean, React.Dispatch<React.SetStateAction<T>>]}
 */
export function useOptimistic(initialState) {
    const [state, setState] = useState(initialState);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Perform an optimistic update
     * @param {T} newValue - The new optimistic value to set immediately
     * @param {() => Promise<any>} apiCall - The API call to execute
     * @returns {Promise<void>}
     */
    const optimisticUpdate = useCallback(async (newValue, apiCall) => {
        const previousValue = state;
        setError(null);
        setState(newValue);
        setPending(true);

        try {
            await apiCall();
            setPending(false);
        } catch (err) {
            // Rollback to previous state on failure
            setState(previousValue);
            setError(err);
            setPending(false);
            throw err;
        }
    }, [state]);

    /**
     * Reset error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return [state, optimisticUpdate, pending, setState, error, clearError];
}

/**
 * Higher-order function for wrapping API calls with optimistic updates
 * @param {() => void} optimisticAction - Function to update UI immediately
 * @param {() => Promise<any>} apiCall - The actual API call
 * @param {() => void} rollbackAction - Function to rollback on failure
 * @returns {Promise<any>}
 */
export const withOptimisticUpdate = async (
    optimisticAction,
    apiCall,
    rollbackAction
) => {
    optimisticAction();
    try {
        const result = await apiCall();
        return result;
    } catch (error) {
        rollbackAction();
        throw error;
    }
};

export default useOptimistic;
