
export type UserRole = "pm" | "member" | "viewer" | "admin";

export interface UserProfile {
  role: UserRole;
  phone?: string;
  avatar_url?: string;
}

export interface AppUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  profile?: UserProfile;
  tasks_count?: number;
  done_tasks_count?: number;
}

export interface MeUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  role: UserRole;
}

export interface CreateUserPayload {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password: string;
  role?: UserRole;
  phone?: string;
  avatar_url?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  avatar_url?: string;
}
