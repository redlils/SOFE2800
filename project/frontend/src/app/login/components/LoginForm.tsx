'use client'
import {useActionState, useState} from "react";
import {login} from "@/app/actions/auth";

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true);

  const [loginFormState, loginAction, pending] = useActionState(login, undefined);

  return (
    <>
      {isLogin ? (
        <div id={"login-container"}>
          <form action={loginAction} id={"login-form"}>
            <label>
              Username
              <input
                type={"text"}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type={"password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit" disabled={pending}>Submit</button>
          </form>
          <span>Don&#39;t have an account? <a
            rel={"noopener"}
            role={"button"}
            onClick={() => setIsLogin(false)}>Signup</a> today!</span>
        </div>
      ) : (
        // TODO: Create signup container
        "default"
      )}
    </>
  )
}
