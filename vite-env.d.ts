/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_CLOUDINARY_CLOUD: string
  readonly VITE_CLOUDINARY_PRESET: string
  readonly VITE_EMAILJS_SERVICE: string
  readonly VITE_EMAILJS_TEMPLATE_LISTING: string
  readonly VITE_EMAILJS_TEMPLATE_INQUIRY: string
  readonly VITE_EMAILJS_PUBLIC: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
