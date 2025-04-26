const dartApi = require('../dartApi');
const CorpCodeUtil = require('../utils/corpCodeUtil');
const path = require('path');
const fs = require('fs');

/**
 * 회사코드 파일 다운로드 및 활용 예제
 */
async function downloadCorpCodesExample() {
  try {
    // 현재 API 키 확인
    console.log(`현재 설정된 API 키: ${process.env.OPEN_DART_API_KEY ? process.env.OPEN_DART_API_KEY.substring(0, 5) + '...' + process.env.OPEN_DART_API_KEY.substring(process.env.OPEN_DART_API_KEY.length - 5) : '설정되지 않음'}`);
    
    // 데이터 저장 디렉토리 생성
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 1. 회사코드 파일 다운로드
    console.log('1. 회사코드 파일 다운로드 시작...');
    const zipFilePath = await dartApi.downloadCorpCodes(dataDir);
    console.log(`다운로드 완료: ${zipFilePath}\n`);
    
    // ZIP 파일 존재하는지 확인
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP 파일이 존재하지 않습니다: ${zipFilePath}`);
    }
    
    // ZIP 파일 크기 확인
    const stats = fs.statSync(zipFilePath);
    console.log(`ZIP 파일 크기: ${stats.size} 바이트`);
    
    if (stats.size < 1000) {
      // 작은 파일은 오류 응답일 가능성이 높음
      const fileContent = fs.readFileSync(zipFilePath, 'utf8');
      console.log('파일 내용:', fileContent);
      
      if (fileContent.includes('<status>') && fileContent.includes('<message>')) {
        throw new Error('API 응답이 오류를 포함하고 있습니다. .env 파일의 API 키를 확인해주세요.');
      }
    }
    
    // 2. ZIP 파일에서 회사코드 정보 추출
    console.log('\n2. 회사코드 정보 추출 시작...');
    const corpList = await CorpCodeUtil.extractCorpCodes(zipFilePath, dataDir);
    console.log(`총 ${corpList.length}개 회사 정보 추출 완료\n`);
    
    // 3. 회사명으로 정보 검색 예제
    console.log('3. 회사명으로 정보 검색 예제:');
    const searchTerm = '삼성전자';
    const foundByName = CorpCodeUtil.findCorpByName(corpList, searchTerm);
    
    console.log(`'${searchTerm}' 검색 결과 (${foundByName.length}개):`);
    foundByName.forEach(company => {
      console.log(`- 회사명: ${company.corp_name}`);
      console.log(`  고유번호: ${company.corp_code}`);
      console.log(`  종목코드: ${company.stock_code || '비상장'}`);
      console.log('');
    });
    
    // 4. 종목코드로 정보 검색 예제
    console.log('4. 종목코드로 정보 검색 예제:');
    const stockCode = '005930'; // 삼성전자 종목코드
    const foundByStockCode = CorpCodeUtil.findCorpByStockCode(corpList, stockCode);
    
    if (foundByStockCode) {
      console.log(`종목코드 '${stockCode}'의 회사 정보:`);
      console.log(`- 회사명: ${foundByStockCode.corp_name}`);
      console.log(`  고유번호: ${foundByStockCode.corp_code}`);
      console.log(`  영문명: ${foundByStockCode.corp_eng_name || '정보 없음'}`);
      console.log(`  최종변경일: ${foundByStockCode.modify_date || '정보 없음'}`);
    } else {
      console.log(`종목코드 '${stockCode}'에 해당하는 회사를 찾을 수 없습니다.`);
    }
    
  } catch (error) {
    console.error('예제 실행 중 오류 발생:', error.message);
    console.error('\n💡 해결 방법:');
    console.error('1. .env 파일에 올바른 Open DART API 키가 설정되어 있는지 확인하세요.');
    console.error('2. Open DART API 사이트(https://opendart.fss.or.kr)에서 API 키가 유효한지 확인하세요.');
    console.error('3. API 키의 IP 제한이 설정되어 있다면, 현재 IP가 허용되어 있는지 확인하세요.');
  }
}

// 예제 실행
console.log('회사코드 파일 다운로드 및 활용 예제를 시작합니다...');
downloadCorpCodesExample(); 