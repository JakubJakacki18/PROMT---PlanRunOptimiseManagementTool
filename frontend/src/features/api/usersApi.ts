import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "../../app/axiosBaseQuery";
import type { AppUser, CreateUserPayload, UpdateUserPayload } from "../types/users";

type Paged<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["User"],
  endpoints: (b) => ({
    listUsers: b.query<AppUser[], void>({
      query: () => ({ url: "/api/users/", method: "GET" }),
      transformResponse: (data: Paged<AppUser> | AppUser[]) =>
        Array.isArray(data) ? data : data.results,
      providesTags: (res) =>
        res && res.length
          ? [
              ...res.map((u) => ({ type: "User" as const, id: u.id })),
              { type: "User" as const, id: "LIST" },
            ]
          : [{ type: "User" as const, id: "LIST" }],
    }),

    getUser: b.query<AppUser, number>({
      query: (id) => ({ url: `/api/users/${id}/`, method: "GET" }),
      providesTags: (_res, _err, id) => [{ type: "User" as const, id }],
    }),

    createUser: b.mutation<AppUser, CreateUserPayload>({
      query: (body) => ({ url: "/api/users/", method: "POST", data: body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    updateUser: b.mutation<AppUser, { id: number; data: UpdateUserPayload }>({
      query: ({ id, data }) => ({
        url: `/api/users/${id}/`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    deleteUser: b.mutation<void, number>({
      query: (id) => ({ url: `/api/users/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
