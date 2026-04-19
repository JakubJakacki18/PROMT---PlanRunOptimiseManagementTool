import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "../../app/axiosBaseQuery";
import type { MeUser } from "../types/users";

type LoginBody = { username: string; password: string };

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (b) => ({
    csrf: b.query<{ detail: string }, void>({
      query: () => ({ url: "/api/auth/csrf/" }),
    }),
    login: b.mutation<MeUser, LoginBody>({
      query: (body) => ({
        url: "/api/auth/login/",
        method: "post",
        data: body,
      }),
    }),
    logout: b.mutation<void, void>({
      query: () => ({ url: "/api/auth/logout/", method: "post" }),
    }),
    me: b.query<MeUser, void>({
      query: () => ({ url: "/api/auth/me/" }),
    }),
  }),
});

export const { useCsrfQuery, useLoginMutation, useLogoutMutation, useMeQuery } =
  authApi;
