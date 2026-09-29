"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SignOutOnLoad() {
  useEffect(() => {
    signOut({ redirect: false }).catch(() => {});
  }, []);
  return null;
}
