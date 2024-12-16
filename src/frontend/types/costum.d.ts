// types/custom.d.ts

declare module "react" {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
        directory?: string;
    }
}
  
  export {};  // This ensures it's treated as a module
  