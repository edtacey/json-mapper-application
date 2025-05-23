/// <reference types="vite/client" />

interface ImportMeta {
  env: {
    VITE_API_URL: string;
    [key: string]: string;
  }
}