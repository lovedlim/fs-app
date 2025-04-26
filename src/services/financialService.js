const axios = require('axios');
const config = require('../config');

/**
 * 재무제표 관련 API 서비스
 */
class FinancialService {
  constructor() {
    this.apiKey = config.openDartApi.apiKey;
    this.baseUrl = config.openDartApi.baseUrl;
  }

  /**
   * 단일회사 주요계정 조회
   * @param {object} params - 요청 매개변수
   * @param {string} params.corp_code - 공시대상회사의 고유번호(8자리)
   * @param {string} params.bsns_year - 사업연도(4자리)
   * @param {string} params.reprt_code - 보고서 코드 (11011:사업보고서, 11012:반기보고서, 11013:1분기보고서, 11014:3분기보고서)
   * @returns {Promise<object>} - 재무제표 데이터
   */
  async getSingleCorpAccount(params) {
    try {
      const url = `${this.baseUrl}/fnlttSinglAcnt.json`;
      
      const response = await axios.get(url, {
        params: {
          crtfc_key: this.apiKey,
          ...params
        }
      });
      
      // 응답 데이터 유효성 검사
      if (response.data.status !== '000') {
        throw new Error(`API 오류: [${response.data.status}] ${response.data.message}`);
      }
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('재무제표 조회 중 API 오류:', error.response.data);
        throw new Error(`API 오류: ${error.response.data.message || '알 수 없는 오류'}`);
      }
      console.error('재무제표 조회 중 오류 발생:', error.message);
      throw error;
    }
  }

  /**
   * 재무제표 데이터 정제 및 구조화
   * @param {object} data - API 응답 데이터
   * @returns {object} - 구조화된 재무제표 데이터
   */
  processFinancialData(data) {
    if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
      return {
        companyInfo: {},
        statements: {}
      };
    }

    // 연결재무제표와 개별재무제표 분리
    const cfsItems = data.list.filter(item => item.fs_div === 'CFS');
    const ofsItems = data.list.filter(item => item.fs_div === 'OFS');
    
    // 연결재무제표가 있으면 연결재무제표 우선, 없으면 개별재무제표 사용
    const items = cfsItems.length > 0 ? cfsItems : ofsItems;
    
    // 재무제표 타입 (연결 또는 개별)
    const fsType = cfsItems.length > 0 ? 'consolidated' : 'separate';
    const fsName = cfsItems.length > 0 ? '연결재무제표' : '개별재무제표';

    // 회사 정보 추출
    const firstItem = items[0] || data.list[0]; // 항목이 없을 경우를 대비
    const companyInfo = {
      corporationCode: firstItem.corp_code,
      stockCode: firstItem.stock_code,
      businessYear: firstItem.bsns_year,
      reportCode: firstItem.reprt_code,
      reportName: this.getReportNameByCode(firstItem.reprt_code),
      statementType: fsType,
      statementName: fsName,
      currentTermName: firstItem.thstrm_nm,
      currentTermDate: firstItem.thstrm_dt,
      previousTermName: firstItem.frmtrm_nm,
      previousTermDate: firstItem.frmtrm_dt,
      previousPreviousTermName: firstItem.bfefrmtrm_nm,
      previousPreviousTermDate: firstItem.bfefrmtrm_dt
    };

    // 재무제표 데이터 그룹화
    const statements = {};

    // 데이터 아이템 처리 (선택된 재무제표 타입만)
    items.forEach(item => {
      const statementType = item.sj_div;
      const statementName = item.sj_nm;
      
      // 재무제표 유형이 없으면 새로 생성
      if (!statements[statementType]) {
        statements[statementType] = {
          title: statementName,
          accounts: []
        };
      }

      // 계정 항목 추가
      statements[statementType].accounts.push({
        name: item.account_nm,
        order: item.ord,
        currentAmount: this.parseAmount(item.thstrm_amount),
        currentAddAmount: this.parseAmount(item.thstrm_add_amount),
        previousAmount: this.parseAmount(item.frmtrm_amount),
        previousAddAmount: this.parseAmount(item.frmtrm_add_amount),
        previousPreviousAmount: this.parseAmount(item.bfefrmtrm_amount),
        currency: item.currency
      });
    });

    // 각 재무제표 내의 계정 항목을 순서대로 정렬
    Object.keys(statements).forEach(key => {
      statements[key].accounts.sort((a, b) => {
        return (a.order || 0) - (b.order || 0);
      });
    });

    return {
      companyInfo,
      statements
    };
  }
  
  /**
   * 금액 문자열을 숫자로 변환
   * @param {string} amountStr - 금액 문자열 (예: "1,234,567")
   * @returns {number|null} - 변환된 숫자 또는 null
   */
  parseAmount(amountStr) {
    if (!amountStr) return null;
    
    // 쉼표 제거 및 숫자로 변환
    const clean = amountStr.replace(/,/g, '');
    const number = parseFloat(clean);
    
    return isNaN(number) ? null : number;
  }
  
  /**
   * 보고서 코드로 보고서 이름 반환
   * @param {string} reportCode - 보고서 코드
   * @returns {string} - 보고서 이름
   */
  getReportNameByCode(reportCode) {
    const reportTypes = {
      '11011': '사업보고서',
      '11012': '반기보고서',
      '11013': '1분기보고서',
      '11014': '3분기보고서'
    };
    
    return reportTypes[reportCode] || '알 수 없는 보고서';
  }
  
  /**
   * 연도별 사업보고서 가져오기
   * @param {string} corpCode - 회사 고유번호
   * @param {number} year - 조회 연도
   * @returns {Promise<object>} - 처리된 재무제표 데이터
   */
  async getAnnualReport(corpCode, year) {
    const data = await this.getSingleCorpAccount({
      corp_code: corpCode,
      bsns_year: year.toString(),
      reprt_code: '11011' // 사업보고서
    });
    
    return this.processFinancialData(data);
  }
  
  /**
   * 특정 분기 보고서 가져오기
   * @param {string} corpCode - 회사 고유번호
   * @param {number} year - 조회 연도
   * @param {number} quarter - 분기 (1, 2, 3, 4)
   * @returns {Promise<object>} - 처리된 재무제표 데이터
   */
  async getQuarterlyReport(corpCode, year, quarter) {
    // 분기에 따른 보고서 코드 매핑
    const reportCodes = {
      1: '11013', // 1분기보고서
      2: '11012', // 반기보고서
      3: '11014', // 3분기보고서
      4: '11011'  // 사업보고서
    };
    
    if (!reportCodes[quarter]) {
      throw new Error(`유효하지 않은 분기입니다: ${quarter}. 1, 2, 3, 4 중 하나여야 합니다.`);
    }
    
    const data = await this.getSingleCorpAccount({
      corp_code: corpCode,
      bsns_year: year.toString(),
      reprt_code: reportCodes[quarter]
    });
    
    return this.processFinancialData(data);
  }
}

module.exports = new FinancialService(); 