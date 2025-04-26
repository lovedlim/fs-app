const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const CompanyDatabase = require('./db/database');
const financialService = require('./services/financialService');
const aiService = require('./services/aiService');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 회사 데이터베이스 객체
const companyDb = new CompanyDatabase();

// 데이터베이스 연결
let dbInitialized = false;
async function initDb() {
  try {
    await companyDb.connect();
    dbInitialized = true;
    console.log('데이터베이스 연결 성공');
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
  }
}

// API 라우트 설정

// 회사명으로 회사 검색
app.get('/api/companies/search', async (req, res) => {
  try {
    if (!dbInitialized) {
      await initDb();
    }
    
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: '검색어는 최소 2글자 이상 입력해주세요.'
      });
    }
    
    const companies = await companyDb.searchByName(query.trim());
    res.json(companies);
  } catch (error) {
    console.error('회사 검색 중 오류:', error);
    res.status(500).json({ error: '회사 검색 중 오류가 발생했습니다.' });
  }
});

// 종목코드로 회사 조회
app.get('/api/companies/stock/:stockCode', async (req, res) => {
  try {
    if (!dbInitialized) {
      await initDb();
    }
    
    const { stockCode } = req.params;
    const company = await companyDb.searchByStockCode(stockCode);
    
    if (!company) {
      return res.status(404).json({ error: '해당 종목코드의 회사를 찾을 수 없습니다.' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('회사 조회 중 오류:', error);
    res.status(500).json({ error: '회사 조회 중 오류가 발생했습니다.' });
  }
});

// 재무제표 조회 - 연간
app.get('/api/financial/:corpCode/annual/:year', async (req, res) => {
  try {
    const { corpCode, year } = req.params;
    
    if (!corpCode || !year) {
      return res.status(400).json({ error: '회사 코드와 연도가 필요합니다.' });
    }
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2015 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({ error: '유효한 연도(2015년 이후)를 입력해주세요.' });
    }
    
    const financial = await financialService.getAnnualReport(corpCode, yearNum);
    res.json(financial);
  } catch (error) {
    console.error('재무제표 조회 중 오류:', error);
    res.status(500).json({ error: '재무제표 조회 중 오류가 발생했습니다.' });
  }
});

// 재무제표 조회 - 분기
app.get('/api/financial/:corpCode/quarterly/:year/:quarter', async (req, res) => {
  try {
    const { corpCode, year, quarter } = req.params;
    
    if (!corpCode || !year || !quarter) {
      return res.status(400).json({ error: '회사 코드, 연도, 분기가 필요합니다.' });
    }
    
    const yearNum = parseInt(year, 10);
    const quarterNum = parseInt(quarter, 10);
    
    if (isNaN(yearNum) || yearNum < 2015 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({ error: '유효한 연도(2015년 이후)를 입력해주세요.' });
    }
    
    if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      return res.status(400).json({ error: '유효한 분기(1-4)를 입력해주세요.' });
    }
    
    const financial = await financialService.getQuarterlyReport(corpCode, yearNum, quarterNum);
    res.json(financial);
  } catch (error) {
    console.error('재무제표 조회 중 오류:', error);
    res.status(500).json({ error: '재무제표 조회 중 오류가 발생했습니다.' });
  }
});

// 재무제표 AI 설명 API 엔드포인트
app.get('/api/financial/:corpCode/explain/:year/:quarter?', async (req, res) => {
  try {
    const { corpCode, year, quarter } = req.params;
    
    if (!corpCode || !year) {
      return res.status(400).json({ error: '회사 코드와 연도가 필요합니다.' });
    }
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2015 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({ error: '유효한 연도(2015년 이후)를 입력해주세요.' });
    }
    
    let financialData;
    if (quarter) {
      const quarterNum = parseInt(quarter, 10);
      if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
        return res.status(400).json({ error: '유효한 분기(1-4)를 입력해주세요.' });
      }
      financialData = await financialService.getQuarterlyReport(corpCode, yearNum, quarterNum);
    } else {
      financialData = await financialService.getAnnualReport(corpCode, yearNum);
    }
    
    // AI 서비스를 통해 재무제표 설명 생성
    const explanation = await aiService.explainFinancialStatements(financialData);
    
    res.json({ 
      explanation,
      financialData
    });
  } catch (error) {
    console.error('재무제표 AI 설명 생성 중 오류:', error);
    res.status(500).json({ error: '재무제표 설명 생성 중 오류가 발생했습니다.' });
  }
});

// 회사 정보 조회
app.get('/api/companies/:corpCode', async (req, res) => {
  try {
    if (!dbInitialized) {
      await initDb();
    }
    
    const { corpCode } = req.params;
    const company = await companyDb.getByCorpCode(corpCode);
    
    if (!company) {
      return res.status(404).json({ error: '해당 고유번호의 회사를 찾을 수 없습니다.' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('회사 정보 조회 중 오류:', error);
    res.status(500).json({ error: '회사 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 루트 경로 - 프론트엔드 SPA 제공
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 서버 시작
app.listen(PORT, async () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  await initDb();
});

// 프로세스 종료 시 데이터베이스 연결 닫기
process.on('SIGINT', async () => {
  console.log('서버를 종료합니다...');
  if (dbInitialized) {
    await companyDb.close();
  }
  process.exit(0);
}); 