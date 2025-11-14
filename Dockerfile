###
# 1) BUILD IMAGE — dependências + build
###
FROM node:20-alpine AS builder

WORKDIR /app

# Copia somente manifests primeiro (melhora cache)
COPY package*.json ./
RUN npm install --production=false

# Copia o restante do código
COPY . .

# Build do Nest (gera dist/)
RUN npm run build


###
# 2) RUNNER IMAGE — leve e segura
###
FROM node:20-alpine AS runner

WORKDIR /app

# Copia somente o build final
COPY --from=builder /app/dist ./dist

# Copia apenas dependências de produção
COPY package*.json ./
RUN npm install --production

# Usuário sem privilégios
USER node

EXPOSE 3023
CMD ["node", "dist/main"]
