const path = require('path');
const fs = require('fs');
const CompanyDatabase = require('../src/db/database');

/**
 * 회사코드 JSON 파일을 데이터베이스로 임포트
 */
async function initializeDatabase() {
  try {
    // 경로 설정
    const jsonFilePath = path.join(__dirname, '../data/corpCodes.json');
    const dbDir = path.join(__dirname, '../data');
    
    // 데이터 디렉토리 확인 및 생성
    if (!fs.existsSync(dbDir)) {
      console.log(`데이터 디렉토리 생성: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // JSON 파일 존재 확인
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`오류: corpCodes.json 파일이 존재하지 않습니다: ${jsonFilePath}`);
      console.error('먼저 "npm run download-corp-codes" 명령을 실행하여 회사코드 파일을 다운로드하세요.');
      process.exit(1);
    }
    
    console.log('데이터베이스 초기화 시작...');
    
    // 데이터베이스 객체 생성
    const db = new CompanyDatabase();
    
    // 테이블 생성
    console.log('테이블 생성 중...');
    await db.createTables();
    
    // JSON 파일에서 데이터 임포트
    console.log(`JSON 파일(${jsonFilePath})에서 데이터 임포트 중...`);
    const count = await db.importFromJson(jsonFilePath);
    
    console.log(`데이터베이스 초기화 완료: ${count}개 회사 정보 임포트됨.`);
    
    // 데이터베이스 연결 종료
    await db.close();
    
  } catch (error) {
    console.error('데이터베이스 초기화 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
initializeDatabase(); 