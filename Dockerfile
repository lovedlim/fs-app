FROM node:20-alpine

WORKDIR /app

# 의존성 설치를 위한 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 환경 변수 설정
ENV PORT=3000
ENV NODE_ENV=production

# 데이터베이스 초기화 실행
RUN npm run init-db

# 포트 노출
EXPOSE 3000

# 애플리케이션 실행
CMD ["node", "src/server.js"] 