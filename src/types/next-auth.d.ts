import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:       string;
      email:    string;
      name?:    string | null;
      image?:   string | null;
      role:     string;
      fullName: string;
    };
    // true when the session has gone past the inactivity limit or the 12-hour maximum
    invalid?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role:     string;
    fullName: string;
    userId:   string;
    loginAt?:    number;   // when the user signed in (ms)
    lastActive?: number;   // last activity reported by the browser (ms)
    idleLimit?:  number;   // inactivity limit for the page they were last active on (ms)
  }
}
