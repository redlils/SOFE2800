import LoginForm from "@/app/login/components/LoginForm";
import {cookies} from "next/headers";
import {router} from "next/client";

export default function Login() {
  // const cookieStore =  cookies();
  // if (cookieStore.get("token")) {
    // await router.replace("/");
  // }
  return (<LoginForm/>)
}
