/*
Code in this file adapted from the Next.js authentication
guide (https://nextjs.org/docs/app/building-your-application/authentication)
 */

import {LoginFormSchema, LoginFormState} from "@/app/lib/definitions";

export async function login(formState: LoginFormState, formData: FormData) {
  const validatedFields = LoginFormSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = await fetch("http://localhost:21923", {
    method: "POST",
    body: JSON.stringify({
      username: formData.get("username"),
      password: formData.get("password")
    })
  })

}
