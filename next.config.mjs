/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permite servir imágenes desde Supabase Storage (ajusta el host a tu proyecto).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
