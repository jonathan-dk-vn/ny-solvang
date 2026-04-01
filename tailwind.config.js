/** @type {import('tailwindcss').Config} */
export default {
  // Quan trọng: Quét index.html VÀ toàn bộ file JS trong folder scripts
  content: [
    "./index.html",
    "./scripts/**/*.{js,ts}", 
  ],
  theme: {
    extend: {
      // Bạn có thể mở rộng theme tại đây nếu muốn khớp với style.css cũ
      colors: {
        // Ví dụ map các biến CSS hiện tại của bạn vào Tailwind nếu cần
        // 'text-body': 'var(--color-text-body)',
      }
    },
  },
  plugins: [],
}