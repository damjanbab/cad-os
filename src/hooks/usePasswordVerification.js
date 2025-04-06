import { useCallback } from 'react';

// Hardcoded password for demonstration (NOTE: Insecure)
const EXPECTED_PASSWORD = 'damjan22';

/**
 * Custom hook to manage password verification for models using component state.
 * @param {Object} verifiedModels - State object tracking verified models.
 * @param {Function} setVerifiedModels - State setter function for verifiedModels.
 * @returns {{
 *   isPasswordRequired: (modelName: string, modelDefinition: Object) => boolean,
 *   verifyPasswordAttempt: (modelName: string, enteredPassword: string) => { success: boolean, error?: string }
 * }}
 */
export function usePasswordVerification(verifiedModels, setVerifiedModels) {

  /**
   * Checks if a password is required for the model and hasn't been verified yet.
   * @param {string} modelName - The name of the model.
   * @param {Object} modelDefinition - The definition object for the model.
   * @returns {boolean} - True if password input is needed, false otherwise.
   */
  const isPasswordRequired = useCallback((modelName, modelDefinition) => {
    return !!(modelDefinition?.requiresPassword && !verifiedModels[modelName]);
  }, [verifiedModels]);

  /**
   * Verifies the entered password against the expected password.
   * Updates verification state if correct.
   * @param {string} modelName - The name of the model being verified.
   * @param {string} enteredPassword - The password entered by the user.
   * @returns {{ success: boolean, error?: string }} - Result of the verification attempt.
   */
  const verifyPasswordAttempt = useCallback((modelName, enteredPassword) => {
    if (enteredPassword === EXPECTED_PASSWORD) {
      // Password correct, mark as verified for this session
      setVerifiedModels(prev => ({ ...prev, [modelName]: true }));
      return { success: true };
    } else {
      // Handle incorrect password
      return { success: false, error: "Incorrect password" };
    }
  }, [setVerifiedModels]); // Only depends on the setter

  return { isPasswordRequired, verifyPasswordAttempt };
}
