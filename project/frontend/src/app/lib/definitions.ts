/*
 The contents of this file have been adapted from the Authentication guide
 for Next.js by Vercel. (https://nextjs.org/docs/app/building-your-application/authentication)
 */
import {z} from "zod";

export const LoginFormSchema = z
  .object({
    username: z
      .string()
      .trim(),
    password: z
      .string()
      .trim()
  })

export type LoginFormState =
  | {
    errors?: {
      name?: string[],
      password?: string[],
    },
    message?: string
  }
  | undefined