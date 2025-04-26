const dartApi = require('./src/dartApi');

// 환경변수 확인
console.log('환경변수 로드 상태:');
console.log(`API 키: ${process.env.OPEN_DART_API_KEY ? '설정됨' : '설정되지 않음'}`);

// 예제: 삼성전자 공시정보 조회
async function getDartExample() {
  try {
    // 삼성전자 고유번호
    const samsungCorpCode = '00126380';
    
    // 회사 기본정보 조회
    console.log('회사 기본정보 조회 중...');
    const companyInfo = await dartApi.getCompanyInfo(samsungCorpCode);
    console.log('회사 기본정보:', companyInfo);
    
    // 최근 공시 정보 조회
    console.log('최근 공시정보 조회 중...');
    const disclosures = await dartApi.getDisclosureList({
      corp_code: samsungCorpCode,
      bgn_de: '20230101', // 시작일
      end_de: '20231231', // 종료일
      pblntf_ty: 'A', // 공시유형: 정기공시
      last_reprt_at: 'Y' // 최종보고서 여부
    });
    console.log('공시 목록:', disclosures);
  } catch (error) {
    console.error('API 요청 중 오류 발생:', error);
  }
}

// 실행
console.log('Open DART API 테스트를 시작합니다...');
getDartExample(); 