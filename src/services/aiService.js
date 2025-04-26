const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

/**
 * AI 서비스 클래스
 * Gemini API를 사용하여 재무제표 분석과 설명을 제공합니다.
 */
class AIService {
  constructor() {
    this.apiKey = config.geminiApi.apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  /**
   * 재무제표 데이터를 바탕으로 설명 생성
   * @param {Object} financialData - 재무제표 데이터
   * @returns {Promise<string>} - 생성된 설명 텍스트
   */
  async explainFinancialStatements(financialData) {
    try {
      if (!financialData || !financialData.statements) {
        throw new Error('유효한 재무제표 데이터가 아닙니다.');
      }

      // 프롬프트 생성
      const prompt = this.generatePrompt(financialData);
      
      // Gemini API 호출
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('AI 설명 생성 중 오류:', error);
      if (error.message === 'API key not available') {
        return '설정된 API 키가 없습니다. .env 파일에 GEMINI_API_KEY를 설정해주세요.';
      }
      return `재무제표 설명을 생성하는 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  /**
   * 재무제표 데이터를 기반으로 프롬프트 생성
   * @param {Object} financialData - 재무제표 데이터
   * @returns {string} - 생성된 프롬프트
   */
  generatePrompt(financialData) {
    const { companyInfo, statements } = financialData;
    
    // 기본 회사 정보
    let prompt = `다음 회사의 재무제표를 분석하고 쉽게 설명해 주세요:\n\n`;
    prompt += `회사명: ${companyInfo.stockCode || '정보 없음'}\n`;
    prompt += `기간: ${companyInfo.currentTermName || '정보 없음'} (${companyInfo.currentTermDate || '정보 없음'})\n\n`;
    
    // 재무상태표
    if (statements.BS && statements.BS.accounts) {
      prompt += `재무상태표 주요 계정:\n`;
      statements.BS.accounts
        .filter(account => this.isKeyAccount(account.name))
        .forEach(account => {
          prompt += `- ${account.name}: ${this.formatAmount(account.currentAmount)}\n`;
        });
      prompt += '\n';
    }
    
    // 손익계산서
    if (statements.IS && statements.IS.accounts) {
      prompt += `손익계산서 주요 계정:\n`;
      statements.IS.accounts
        .filter(account => this.isKeyAccount(account.name))
        .forEach(account => {
          prompt += `- ${account.name}: ${this.formatAmount(account.currentAmount)}\n`;
        });
      prompt += '\n';
    }
    
    // 분석 요청
    prompt += `다음 내용을 포함해 재무제표를 쉽게 설명해 주세요:
1. 회사의 전반적인 재무 건전성
2. 주요 재무 지표 분석 (수익성, 안정성, 성장성)
3. 투자자 입장에서 알아야 할 중요 포인트
4. 전기 대비 변화된 점
5. 향후 전망에 대한 의견

가능한 전문 용어를 피하고, 일반인도 이해하기 쉽게 설명해 주세요. 필요한 경우 비유를 사용하셔도 좋습니다.`;
    
    return prompt;
  }
  
  /**
   * 주요 계정 여부 확인
   * @param {string} accountName - 계정명
   * @returns {boolean} - 주요 계정 여부
   */
  isKeyAccount(accountName) {
    const keyAccounts = [
      '자산총계', '부채총계', '자본총계', '유동자산', '비유동자산', 
      '유동부채', '비유동부채', '자본금', '이익잉여금',
      '매출액', '영업이익', '법인세비용차감전순이익', '당기순이익',
      '매출총이익', '영업비용', '영업외수익', '영업외비용'
    ];
    
    return keyAccounts.some(name => accountName.includes(name));
  }
  
  /**
   * 금액 포맷팅
   * @param {number} amount - 금액
   * @returns {string} - 포맷팅된 금액
   */
  formatAmount(amount) {
    if (amount === null || amount === undefined) return '정보 없음';
    
    // 금액을 한국어 표기법으로 변환 (억, 조 단위)
    const trillion = 1000000000000;
    const billion = 100000000;
    const million = 10000;
    
    if (Math.abs(amount) >= trillion) {
      return (amount / trillion).toFixed(2) + '조원';
    } else if (Math.abs(amount) >= billion) {
      return (amount / billion).toFixed(2) + '억원';
    } else if (Math.abs(amount) >= million) {
      return (amount / million).toFixed(2) + '만원';
    } else {
      return amount.toLocaleString() + '원';
    }
  }
}

module.exports = new AIService(); 