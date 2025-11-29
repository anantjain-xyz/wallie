import { useState } from "react";

export interface UserPreferences {
  order_by: string;
  order_direction: "asc" | "desc";
}

const STORAGE_KEY = "wallie_user_preferences";

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  order_by: "priority",
  order_direction: "desc",
};

export function useUserPreferences(): [
  UserPreferences,
  (preferences: Partial<UserPreferences>) => void,
] {
  // Initialize state with preferences from localStorage or defaults
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const storedPreferences = localStorage.getItem(STORAGE_KEY);
      if (!storedPreferences) return DEFAULT_PREFERENCES;

      const parsed = JSON.parse(storedPreferences);
      return {
        order_by: parsed.order_by ?? DEFAULT_PREFERENCES.order_by,
        order_direction:
          parsed.order_direction ?? DEFAULT_PREFERENCES.order_direction,
      };
    } catch (error) {
      console.error("Error reading preferences from localStorage:", error);
      return DEFAULT_PREFERENCES;
    }
  });

  // Update preferences in state and localStorage
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated: UserPreferences = {
        order_by: newPreferences.order_by ?? prev.order_by,
        order_direction: newPreferences.order_direction ?? prev.order_direction,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving preferences to localStorage:", error);
      }

      return updated;
    });
  };

  return [preferences, updatePreferences];
}
