# 재무제표 시각화 서비스

이 서비스는 Open DART API를 활용하여 한국 상장 기업의 재무제표를 시각화하고 AI 분석을 제공하는 웹 애플리케이션입니다.

## 주요 기능

- 회사명 또는 종목코드로 기업 검색
- 연간/분기별 재무제표 조회
- 재무상태표, 손익계산서 시각화
- 주요 재무비율 분석 (수익성, 안정성)
- Gemini API를 활용한 재무제표 AI 설명

## 기술 스택

- 백엔드: Node.js, Express
- 프론트엔드: HTML, CSS, JavaScript, Bootstrap, Chart.js
- 데이터베이스: SQLite
- API: Open DART API, Google Gemini API

## 설치 및 실행 방법

### 로컬 개발 환경

1. 저장소 클론
   ```
   git clone <repository-url>
   cd fs-project
   ```

2. 의존성 설치
   ```
   npm install
   ```

3. 환경 변수 설정
   ```
   cp .env.example .env
   ```
   `.env` 파일을 열어 API 키 설정

4. 데이터베이스 초기화
   ```
   npm run init-db
   ```

5. 애플리케이션 실행
   ```
   npm run dev
   ```

6. 브라우저에서 `http://localhost:3000` 접속

### Render.com에 무료 배포하기

Render.com은 Node.js 앱을 쉽게 배포할 수 있는 클라우드 서비스로, 무료 티어를 제공합니다.

#### 수동 배포

1. [Render.com](https://render.com/)에 회원가입 및 로그인합니다.

2. 대시보드에서 "New +" 버튼을 클릭하고 "Web Service"를 선택합니다.

3. GitHub 저장소에 코드를 푸시한 후, "Connect a repository" 선택 및 저장소 연결

4. 서비스 설정:
   - **Name**: financial-statement-app (원하는 이름)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. "Advanced" 섹션에서 환경 변수 설정:
   - `OPEN_DART_API_KEY`: Open DART API 키
   - `GEMINI_API_KEY`: Google Gemini API 키
   - `NODE_ENV`: production

6. "Create Web Service" 버튼 클릭하여 배포

7. 배포가 완료되면 제공된 URL로 접속하여 서비스 확인

#### render.yaml을 통한 배포

프로젝트에 포함된 `render.yaml` 파일을 사용하여 배포할 수 있습니다:

1. [Render.com](https://render.com/)에 회원가입 및 로그인합니다.

2. "Blueprint" 메뉴로 이동합니다.

3. GitHub 저장소를 연결하고 `render.yaml` 파일이 포함된 저장소 선택

4. "Apply Blueprint" 버튼 클릭하여 배포

5. 환경 변수 설정:
   - `OPEN_DART_API_KEY`: Open DART API 키
   - `GEMINI_API_KEY`: Google Gemini API 키

#### GitHub Actions를 통한 자동 배포

GitHub Actions를 사용하여 코드 변경 시 자동으로 배포할 수 있습니다:

1. GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿 추가:
   - `RENDER_SERVICE_ID`: Render 서비스 ID
   - `RENDER_API_KEY`: Render API 키

2. 코드를 `main` 또는 `master` 브랜치에 푸시하면 자동으로 배포됩니다.

**참고**: Render 무료 티어는 15분 비활성 후 슬립 모드로 전환되며, 다음 요청 시 다시 활성화됩니다 (첫 요청은 약간 지연될 수 있음).

### Docker를 이용한 배포

#### Docker Compose 사용

1. 저장소 클론
   ```
   git clone <repository-url>
   cd fs-project
   ```

2. 환경 변수 설정
   ```
   cp .env.example .env
   ```
   `.env` 파일을 열어 API 키 설정

3. Docker Compose로 실행
   ```
   docker-compose up -d
   ```

4. 브라우저에서 `http://localhost:3000` 접속

#### 수동 Docker 배포

1. Docker 이미지 빌드
   ```
   docker build -t financial-statement-app .
   ```

2. Docker 컨테이너 실행
   ```
   docker run -d -p 3000:3000 \
     -e OPEN_DART_API_KEY=your_api_key \
     -e GEMINI_API_KEY=your_gemini_api_key \
     -v $(pwd)/data:/app/data \
     --name financial-statement-app \
     financial-statement-app
   ```

3. 브라우저에서 `http://localhost:3000` 접속

### 클라우드 배포 (예: AWS EC2)

1. EC2 인스턴스 접속
   ```
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

2. Docker 설치 (Amazon Linux 2 기준)
   ```
   sudo yum update -y
   sudo amazon-linux-extras install docker
   sudo service docker start
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   ```

3. Docker Compose 설치
   ```
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. 애플리케이션 배포
   ```
   git clone <repository-url>
   cd fs-project
   cp .env.example .env
   # .env 파일 편집
   docker-compose up -d
   ```

5. 보안 그룹에서 3000 포트 오픈 설정

6. 브라우저에서 `http://your-instance-ip:3000` 접속

## 환경 변수

| 변수명 | 설명 | 필수 여부 |
|--------|------|----------|
| OPEN_DART_API_KEY | Open DART API 키 | 필수 |
| GEMINI_API_KEY | Google Gemini API 키 | 필수 |
| PORT | 서버 포트 | 선택 (기본값: 3000) |
| NODE_ENV | 노드 환경 설정 | 선택 (기본값: development) |

## 라이센스

ISC 