# --- BUILD ---
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # Copia Prisma primeiro
    COPY prisma ./prisma
    
    # Copia package.json
    COPY package*.json ./
    
    # Instala dependências
    RUN npm install
    
    # Gera Prisma Clients
    RUN npx prisma generate --schema=prisma/schema_main.prisma
    RUN npx prisma generate --schema=prisma/schema_tenant.prisma
    
    # Copia resto do fonte
    COPY . .
    
    # Compila
    RUN npm run build
    
    
    # --- RUNTIME ---
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    # Copia arquivos necessários
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    
    EXPOSE 3023
    
    CMD ["node", "dist/main.js"]
    