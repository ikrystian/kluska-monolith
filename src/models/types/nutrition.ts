// Nutrition-related types

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Meal {
  id: string;
  ownerId: string;
  date: string;
  type: MealType;
  foodItems: FoodItem[];
}

export interface LoggedMeal {
  id: string;
  ownerId: string;
  date: string;
  type: MealType;
  foodItems: FoodItem[];
}

export interface DietPlan {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  days: {
    dayNumber: number;
    meals: Meal[];
  }[];
  createdAt: string;
}