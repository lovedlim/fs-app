document.addEventListener('DOMContentLoaded', function() {
  // DOM 요소 선택
  const companySearchInput = document.getElementById('companySearch');
  const searchButton = document.getElementById('searchButton');
  const searchResults = document.getElementById('searchResults');
  const companyInfoSection = document.getElementById('companyInfo');
  const financialStatementsSection = document.getElementById('financialStatements');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const yearSelect = document.getElementById('yearSelect');
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  const loadReportButton = document.getElementById('loadReportButton');

  // 차트 객체 저장
  let balanceSheetChart = null;
  let incomeStatementChart = null;
  let profitabilityChart = null;
  let stabilityChart = null;

  // 현재 선택된 회사 정보
  let currentCompany = null;

  // 오늘 날짜로 연도 설정
  const currentYear = new Date().getFullYear();
  updateYearOptions(currentYear);

  // 이벤트 리스너 등록
  searchButton.addEventListener('click', performSearch);
  companySearchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  loadReportButton.addEventListener('click', loadFinancialReport);

  /**
   * 연도 선택 옵션 업데이트
   * @param {number} maxYear - 최대 연도
   */
  function updateYearOptions(maxYear) {
    yearSelect.innerHTML = '';
    for (let year = maxYear; year >= 2015; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
  }

  /**
   * 회사 검색 수행
   */
  async function performSearch() {
    const searchTerm = companySearchInput.value.trim();
    if (searchTerm.length < 2) {
      showError('검색어는 최소 2글자 이상 입력해주세요.');
      return;
    }

    showLoading();
    hideError();
    searchResults.innerHTML = '';

    try {
      const response = await fetch(`/api/companies/search?query=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      displaySearchResults(data);
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
      showError('회사 검색 중 오류가 발생했습니다.');
    } finally {
      hideLoading();
    }
  }

  /**
   * 검색 결과 표시
   * @param {Array} companies - 회사 목록
   */
  function displaySearchResults(companies) {
    searchResults.innerHTML = '';

    if (companies.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'list-group-item';
      noResults.textContent = '검색 결과가 없습니다.';
      searchResults.appendChild(noResults);
      return;
    }

    companies.forEach(company => {
      const resultItem = document.createElement('a');
      resultItem.className = 'list-group-item list-group-item-action search-item';
      resultItem.href = '#';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'fw-bold';
      nameSpan.textContent = company.corp_name;

      const stockCodeSpan = document.createElement('span');
      stockCodeSpan.className = 'ms-2 stock-code';
      stockCodeSpan.textContent = company.stock_code ? `(${company.stock_code})` : '';

      resultItem.appendChild(nameSpan);
      resultItem.appendChild(stockCodeSpan);

      resultItem.addEventListener('click', function(e) {
        e.preventDefault();
        selectCompany(company);
      });

      searchResults.appendChild(resultItem);
    });
  }

  /**
   * 회사 선택
   * @param {object} company - 선택된 회사 정보
   */
  function selectCompany(company) {
    currentCompany = company;
    document.querySelector('.company-name').textContent = company.corp_name;
    document.getElementById('corpCode').textContent = company.corp_code;
    document.getElementById('stockCode').textContent = company.stock_code || '비상장';

    // 검색 결과 숨기기
    searchResults.innerHTML = '';
    // 회사 정보 섹션 표시
    companyInfoSection.classList.remove('d-none');
    // 재무제표 섹션 숨기기
    financialStatementsSection.classList.add('d-none');
  }

  /**
   * 재무제표 보고서 로드
   */
  async function loadFinancialReport() {
    if (!currentCompany) {
      showError('먼저 회사를 선택해주세요.');
      return;
    }

    const corpCode = currentCompany.corp_code;
    const year = yearSelect.value;
    const reportType = reportTypeSelect.value;

    showLoading();
    hideError();
    financialStatementsSection.classList.add('d-none');

    try {
      let url;
      if (reportType === 'annual') {
        url = `/api/financial/${corpCode}/annual/${year}`;
      } else {
        const quarter = reportType.substring(1);
        url = `/api/financial/${corpCode}/quarterly/${year}/${quarter}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      displayFinancialStatements(data);
    } catch (error) {
      console.error('재무제표 로드 중 오류 발생:', error);
      showError('재무제표 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      hideLoading();
    }
  }

  /**
   * 재무제표 표시
   * @param {object} financialData - 재무제표 데이터
   */
  function displayFinancialStatements(financialData) {
    if (!financialData.statements || Object.keys(financialData.statements).length === 0) {
      showError('재무제표 데이터가 없습니다.');
      return;
    }

    // 재무제표 유형 표시 (연결/개별)
    updateFinancialStatementType(financialData.companyInfo);

    // 재무제표 기간 정보 업데이트
    updateFinancialStatementPeriod(financialData.companyInfo);

    // 재무상태표 처리
    const balanceSheet = financialData.statements.BS;
    if (balanceSheet) {
      renderBalanceSheet(balanceSheet);
    }

    // 손익계산서 처리
    const incomeStatement = financialData.statements.IS;
    if (incomeStatement) {
      renderIncomeStatement(incomeStatement);
    }

    // 재무비율 계산 및 표시
    calculateFinancialRatios(financialData);

    // AI 설명 버튼 추가
    addAIExplanationButton(financialData.companyInfo);

    // 재무제표 섹션 표시
    financialStatementsSection.classList.remove('d-none');
  }

  /**
   * 재무제표 유형 표시 업데이트 (연결/개별)
   * @param {object} companyInfo - 회사 정보
   */
  function updateFinancialStatementType(companyInfo) {
    // 기존 뱃지 제거
    const existingBadge = document.querySelector('.statement-type-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // 재무제표 유형 뱃지 생성
    if (companyInfo.statementName) {
      const companyNameElement = document.querySelector('.company-name');
      const badge = document.createElement('span');
      badge.className = 'badge bg-info ms-2 statement-type-badge';
      badge.textContent = companyInfo.statementName;
      companyNameElement.appendChild(badge);
    }
  }

  /**
   * 재무제표 기간 정보 업데이트
   * @param {object} companyInfo - 회사 정보
   */
  function updateFinancialStatementPeriod(companyInfo) {
    // 기존 기간 정보 뱃지 제거
    const existingPeriodBadge = document.querySelector('.statement-period-badge');
    if (existingPeriodBadge) {
      existingPeriodBadge.remove();
    }

    // 당기/전기 기간 표시
    const periodInfo = document.createElement('div');
    periodInfo.className = 'small text-muted mt-2 statement-period-badge';
    periodInfo.innerHTML = `
      <strong>당기:</strong> ${companyInfo.currentTermName} (${companyInfo.currentTermDate}), 
      <strong>전기:</strong> ${companyInfo.previousTermName} (${companyInfo.previousTermDate})
    `;
    
    // 재무제표 섹션에 기간 정보 추가
    const financialStatementsHeader = document.querySelector('#financialStatements .card-header');
    financialStatementsHeader.appendChild(periodInfo);
  }

  /**
   * 재무상태표 렌더링
   * @param {object} balanceSheet - 재무상태표 데이터
   */
  function renderBalanceSheet(balanceSheet) {
    // 테이블 데이터 렌더링
    const tableBody = document.querySelector('#balanceSheetTable tbody');
    tableBody.innerHTML = '';

    // 필요한 계정 항목 찾기
    const findAccount = (name) => {
      return balanceSheet.accounts.find(account => account.name === name);
    };

    // 주요 계정 데이터 추출
    const totalAssets = findAccount('자산총계');
    const totalLiabilities = findAccount('부채총계');
    const totalEquity = findAccount('자본총계');
    
    // 유동/비유동 자산 항목 찾기
    const currentAssets = findAccount('유동자산');
    const nonCurrentAssets = findAccount('비유동자산') || {
      name: '비유동자산',
      currentAmount: totalAssets.currentAmount - (currentAssets ? currentAssets.currentAmount : 0),
      previousAmount: totalAssets.previousAmount - (currentAssets ? currentAssets.previousAmount : 0)
    };
    
    // 유동/비유동 부채 항목 찾기
    const currentLiabilities = findAccount('유동부채');
    const nonCurrentLiabilities = findAccount('비유동부채') || {
      name: '비유동부채',
      currentAmount: totalLiabilities.currentAmount - (currentLiabilities ? currentLiabilities.currentAmount : 0),
      previousAmount: totalLiabilities.previousAmount - (currentLiabilities ? currentLiabilities.previousAmount : 0)
    };

    // 모든 주요 계정을 배열로 모으기
    const mainAccounts = [
      totalAssets, totalLiabilities, totalEquity,
      currentAssets, nonCurrentAssets,
      currentLiabilities, nonCurrentLiabilities
    ].filter(Boolean);

    // 박스형 시각화 업데이트
    updateBalanceSheetBoxes(
      totalAssets, totalLiabilities, totalEquity,
      currentAssets, nonCurrentAssets,
      currentLiabilities, nonCurrentLiabilities
    );

    // 주요 계정 테이블에 추가
    mainAccounts.forEach(account => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.className = 'fw-bold';
      nameCell.textContent = account.name;
      
      const currentCell = document.createElement('td');
      currentCell.className = 'text-end financial-value';
      currentCell.textContent = formatCurrencyShort(account.currentAmount);
      
      const previousCell = document.createElement('td');
      previousCell.className = 'text-end';
      previousCell.textContent = formatCurrencyShort(account.previousAmount);
      
      row.appendChild(nameCell);
      row.appendChild(currentCell);
      row.appendChild(previousCell);
      
      tableBody.appendChild(row);
    });

    // 차트 데이터 준비 (자산, 부채, 자본 총계만 차트에 표시)
    const labels = ['자산총계', '부채총계', '자본총계'];
    const currentData = [totalAssets.currentAmount, totalLiabilities.currentAmount, totalEquity.currentAmount];
    const previousData = [totalAssets.previousAmount, totalLiabilities.previousAmount, totalEquity.previousAmount];

    // 차트 생성
    renderBalanceSheetChart(labels, currentData, previousData);
  }

  /**
   * 재무상태표 박스형 시각화 업데이트
   * @param {object} totalAssets - 자산총계
   * @param {object} totalLiabilities - 부채총계
   * @param {object} equity - 자본총계
   * @param {object} currentAssets - 유동자산
   * @param {object} nonCurrentAssets - 비유동자산
   * @param {object} currentLiabilities - 유동부채
   * @param {object} nonCurrentLiabilities - 비유동부채
   */
  function updateBalanceSheetBoxes(
    totalAssets, totalLiabilities, equity,
    currentAssets, nonCurrentAssets,
    currentLiabilities, nonCurrentLiabilities
  ) {
    if (!totalAssets || !totalLiabilities || !equity) {
      console.warn('재무상태표 박스형 시각화를 위한 데이터가 부족합니다.');
      return;
    }

    // 값이 없는 경우 기본값 설정
    const current_assets = currentAssets ? currentAssets.currentAmount : 0;
    const non_current_assets = nonCurrentAssets ? nonCurrentAssets.currentAmount : 0;
    const current_liabilities = currentLiabilities ? currentLiabilities.currentAmount : 0;
    const non_current_liabilities = nonCurrentLiabilities ? nonCurrentLiabilities.currentAmount : 0;
    
    // 자산 총계와 부채 총계
    const total_assets = totalAssets.currentAmount;
    const total_liabilities = totalLiabilities.currentAmount;
    const total_equity = equity.currentAmount;

    // 요약 정보 금액 표시 업데이트
    document.getElementById('assetAmountSummary').textContent = formatCurrencyShort(total_assets);
    document.getElementById('liabilityAmountSummary').textContent = formatCurrencyShort(total_liabilities);
    document.getElementById('equityAmountSummary').textContent = formatCurrencyShort(total_equity);

    // 각 박스의 금액 설정
    document.getElementById('currentAssetAmount').textContent = formatCurrencyShort(current_assets);
    document.getElementById('nonCurrentAssetAmount').textContent = formatCurrencyShort(non_current_assets);
    document.getElementById('currentLiabilityAmount').textContent = formatCurrencyShort(current_liabilities);
    document.getElementById('nonCurrentLiabilityAmount').textContent = formatCurrencyShort(non_current_liabilities);
    document.getElementById('equityAmount').textContent = formatCurrencyShort(total_equity);

    // 자산 내에서의 비율 계산
    const currentAssetPercent = (current_assets / total_assets) * 100;
    const nonCurrentAssetPercent = (non_current_assets / total_assets) * 100;
    
    // 자산 대비 부채와 자본의 비율 계산
    const currentLiabilityPercent = (current_liabilities / total_assets) * 100;
    const nonCurrentLiabilityPercent = (non_current_liabilities / total_assets) * 100;
    const equityPercent = (total_equity / total_assets) * 100;

    // 비율 표시 업데이트
    document.getElementById('currentAssetPercent').textContent = `${currentAssetPercent.toFixed(1)}%`;
    document.getElementById('nonCurrentAssetPercent').textContent = `${nonCurrentAssetPercent.toFixed(1)}%`;
    document.getElementById('currentLiabilityPercent').textContent = `${currentLiabilityPercent.toFixed(1)}%`;
    document.getElementById('nonCurrentLiabilityPercent').textContent = `${nonCurrentLiabilityPercent.toFixed(1)}%`;
    document.getElementById('equityPercent').textContent = `${equityPercent.toFixed(1)}%`;

    // 박스 높이 조정
    // 자산 내에서의 상대적 높이
    const currentAssetBox = document.getElementById('currentAssetBox');
    const nonCurrentAssetBox = document.getElementById('nonCurrentAssetBox');
    
    // 부채+자본 내에서의 상대적 높이
    const currentLiabilityBox = document.getElementById('currentLiabilityBox');
    const nonCurrentLiabilityBox = document.getElementById('nonCurrentLiabilityBox');
    const equityBox = document.getElementById('equityBox');
    
    // 자산 내에서의 비율에 따른 높이 설정
    const totalAssetHeight = 100; // 퍼센트 단위
    currentAssetBox.style.height = `${Math.max(currentAssetPercent, 10)}%`;
    nonCurrentAssetBox.style.height = `${Math.max(nonCurrentAssetPercent, 10)}%`;
    
    // 부채+자본 내에서의 비율에 따른 높이 설정
    const rightSideTotal = total_liabilities + total_equity;
    const currentLiabilityHeight = (current_liabilities / rightSideTotal) * 100;
    const nonCurrentLiabilityHeight = (non_current_liabilities / rightSideTotal) * 100;
    const equityHeight = (total_equity / rightSideTotal) * 100;
    
    currentLiabilityBox.style.height = `${Math.max(currentLiabilityHeight, 10)}%`;
    nonCurrentLiabilityBox.style.height = `${Math.max(nonCurrentLiabilityHeight, 10)}%`;
    equityBox.style.height = `${Math.max(equityHeight, 10)}%`;
    
    // 내부 콘텐츠 중앙 정렬
    const centerContent = (el) => {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.justifyContent = 'center';
    };
    
    centerContent(currentAssetBox);
    centerContent(nonCurrentAssetBox);
    centerContent(currentLiabilityBox);
    centerContent(nonCurrentLiabilityBox);
    centerContent(equityBox);
  }

  /**
   * 재무상태표 차트 렌더링
   * @param {Array} labels - 라벨 배열
   * @param {Array} currentData - 당기 데이터
   * @param {Array} previousData - 전기 데이터
   */
  function renderBalanceSheetChart(labels, currentData, previousData) {
    const ctx = document.getElementById('balanceSheetChart').getContext('2d');
    
    // 기존 차트 제거
    if (balanceSheetChart) {
      balanceSheetChart.destroy();
    }
    
    balanceSheetChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '당기',
            data: currentData,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: '전기',
            data: previousData,
            backgroundColor: 'rgba(153, 102, 255, 0.7)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '재무상태표 비교'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatCurrencyShort(context.raw);
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrencyShort(value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * 손익계산서 렌더링
   * @param {object} incomeStatement - 손익계산서 데이터
   */
  function renderIncomeStatement(incomeStatement) {
    // 테이블 데이터 렌더링
    const tableBody = document.querySelector('#incomeStatementTable tbody');
    tableBody.innerHTML = '';

    // 주요 계정 항목
    const mainAccounts = incomeStatement.accounts.filter(account => {
      return [
        '매출액', '영업이익', '법인세비용차감전순이익', '당기순이익'
      ].includes(account.name);
    });

    // 테이블에 데이터 추가
    mainAccounts.forEach(account => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.className = 'fw-bold';
      nameCell.textContent = account.name;
      
      const currentCell = document.createElement('td');
      currentCell.className = 'text-end financial-value';
      currentCell.textContent = formatCurrencyShort(account.currentAmount);
      
      // 전기 대비 증감률 표시
      const previousCell = document.createElement('td');
      previousCell.className = 'text-end';
      
      if (account.previousAmount) {
        previousCell.textContent = formatCurrencyShort(account.previousAmount);
      } else {
        previousCell.textContent = '-';
      }
      
      row.appendChild(nameCell);
      row.appendChild(currentCell);
      row.appendChild(previousCell);
      
      tableBody.appendChild(row);
    });

    // 차트 데이터 준비
    const labels = mainAccounts.map(account => account.name);
    const currentData = mainAccounts.map(account => account.currentAmount);
    const previousData = mainAccounts.map(account => account.previousAmount);

    // 차트 생성
    renderIncomeStatementChart(labels, currentData, previousData);
  }

  /**
   * 손익계산서 차트 렌더링
   * @param {Array} labels - 라벨 배열
   * @param {Array} currentData - 당기 데이터
   * @param {Array} previousData - 전기 데이터
   */
  function renderIncomeStatementChart(labels, currentData, previousData) {
    const ctx = document.getElementById('incomeStatementChart').getContext('2d');
    
    // 기존 차트 제거
    if (incomeStatementChart) {
      incomeStatementChart.destroy();
    }
    
    incomeStatementChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '당기',
            data: currentData,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: '전기',
            data: previousData,
            backgroundColor: 'rgba(255, 159, 64, 0.7)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '손익계산서 비교'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatCurrencyShort(context.raw);
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrencyShort(value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * 재무비율 계산 및 표시
   * @param {object} financialData - 재무제표 데이터
   */
  function calculateFinancialRatios(financialData) {
    // 재무상태표와 손익계산서 데이터 추출
    const balanceSheet = financialData.statements.BS;
    const incomeStatement = financialData.statements.IS;
    
    if (!balanceSheet || !incomeStatement) {
      return;
    }
    
    // 필요한 계정 값 찾기
    const findAccount = (accounts, name) => {
      const account = accounts.find(a => a.name === name);
      return account ? account.currentAmount : null;
    };
    
    // 재무상태표 계정
    const totalAssets = findAccount(balanceSheet.accounts, '자산총계');
    const totalLiabilities = findAccount(balanceSheet.accounts, '부채총계');
    const totalEquity = findAccount(balanceSheet.accounts, '자본총계');
    
    // 손익계산서 계정
    const revenue = findAccount(incomeStatement.accounts, '매출액');
    const operatingIncome = findAccount(incomeStatement.accounts, '영업이익');
    const netIncome = findAccount(incomeStatement.accounts, '당기순이익');
    
    // 수익성 비율 계산
    const roe = totalEquity ? (netIncome / totalEquity) * 100 : null;
    const roa = totalAssets ? (netIncome / totalAssets) * 100 : null;
    const operatingMargin = revenue ? (operatingIncome / revenue) * 100 : null;
    const netMargin = revenue ? (netIncome / revenue) * 100 : null;
    
    // 안정성 비율 계산
    const debtRatio = totalAssets ? (totalLiabilities / totalAssets) * 100 : null;
    const debtToEquity = totalEquity ? (totalLiabilities / totalEquity) * 100 : null;
    
    // 수익성 차트 렌더링
    renderProfitabilityChart({
      roe: roe,
      roa: roa,
      operatingMargin: operatingMargin,
      netMargin: netMargin
    });
    
    // 안정성 차트 렌더링
    renderStabilityChart({
      debtRatio: debtRatio,
      debtToEquity: debtToEquity
    });
  }

  /**
   * 수익성 비율 차트 렌더링
   * @param {object} ratios - 수익성 비율 객체
   */
  function renderProfitabilityChart(ratios) {
    const ctx = document.getElementById('profitabilityChart').getContext('2d');
    
    // 기존 차트 제거
    if (profitabilityChart) {
      profitabilityChart.destroy();
    }
    
    profitabilityChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['ROE (자기자본이익률)', 'ROA (총자산이익률)', '영업이익률', '순이익률'],
        datasets: [{
          label: '수익성 비율 (%)',
          data: [
            ratios.roe?.toFixed(2) || 0,
            ratios.roa?.toFixed(2) || 0,
            ratios.operatingMargin?.toFixed(2) || 0,
            ratios.netMargin?.toFixed(2) || 0
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(54, 162, 235, 1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '수익성 분석'
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0
          }
        }
      }
    });
  }

  /**
   * 안정성 비율 차트 렌더링
   * @param {object} ratios - 안정성 비율 객체
   */
  function renderStabilityChart(ratios) {
    const ctx = document.getElementById('stabilityChart').getContext('2d');
    
    // 기존 차트 제거
    if (stabilityChart) {
      stabilityChart.destroy();
    }
    
    stabilityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['자기자본', '부채'],
        datasets: [{
          data: [
            100 - (ratios.debtRatio?.toFixed(2) || 0),
            ratios.debtRatio?.toFixed(2) || 0
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 99, 132, 0.7)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '부채비율 분석'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw}%`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * AI 설명 버튼 추가
   * @param {object} companyInfo - 회사 정보
   */
  function addAIExplanationButton(companyInfo) {
    // 기존 버튼 제거
    const existingButton = document.querySelector('#aiExplainButton');
    if (existingButton) {
      existingButton.remove();
    }

    // 설명 컨테이너도 제거
    const existingExplanation = document.querySelector('#aiExplanationContainer');
    if (existingExplanation) {
      existingExplanation.remove();
    }

    // 버튼 생성
    const button = document.createElement('button');
    button.id = 'aiExplainButton';
    button.className = 'btn btn-info mt-2';
    button.innerHTML = '<i class="bi bi-robot"></i> AI 재무제표 설명 생성';
    button.onclick = () => getAIExplanation(companyInfo);
    
    // 설명을 표시할 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'aiExplanationContainer';
    container.className = 'd-none mt-3 p-3 bg-light border rounded';
    
    // 재무제표 헤더에 버튼 추가
    const header = document.querySelector('#financialStatements .card-header');
    header.appendChild(button);
    header.appendChild(container);
  }

  /**
   * AI 재무제표 설명 가져오기
   * @param {object} companyInfo - 회사 정보
   */
  async function getAIExplanation(companyInfo) {
    try {
      const button = document.querySelector('#aiExplainButton');
      const container = document.querySelector('#aiExplanationContainer');
      
      // 버튼 비활성화 및 로딩 표시
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 설명 생성 중...';
      
      // 회사 정보 추출
      const { corporationCode, businessYear, reportCode } = companyInfo;
      
      // 보고서 코드로 분기 여부 확인
      let url = `/api/financial/${corporationCode}/explain/${businessYear}`;
      
      // reportCode가 사업보고서가 아닌 경우 분기 정보 추가
      if (reportCode !== '11011') {
        const quarterMap = {
          '11012': '2', // 반기보고서
          '11013': '1', // 1분기보고서
          '11014': '3'  // 3분기보고서
        };
        const quarter = quarterMap[reportCode];
        if (quarter) {
          url += `/${quarter}`;
        }
      }
      
      // API 호출
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('API 응답 오류');
      }
      
      const data = await response.json();
      
      // 설명 표시
      container.innerHTML = `<h5>AI 재무제표 분석</h5><div>${data.explanation.replace(/\n/g, '<br>')}</div>`;
      container.classList.remove('d-none');
      
      // 버튼 원상복구
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-robot"></i> AI 재무제표 설명 재생성';
    } catch (error) {
      console.error('AI 설명 가져오기 오류:', error);
      showError('AI 설명을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      
      // 버튼 원상복구
      const button = document.querySelector('#aiExplainButton');
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-robot"></i> AI 재무제표 설명 생성';
      }
    }
  }

  /**
   * 로딩 표시
   */
  function showLoading() {
    loadingSpinner.classList.remove('d-none');
  }

  /**
   * 로딩 숨김
   */
  function hideLoading() {
    loadingSpinner.classList.add('d-none');
  }

  /**
   * 오류 메시지 표시
   * @param {string} message - 오류 메시지
   */
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('d-none');
  }

  /**
   * 오류 메시지 숨김
   */
  function hideError() {
    errorMessage.classList.add('d-none');
  }

  /**
   * 금액 형식화
   * @param {number} amount - 금액
   * @returns {string} - 형식화된 금액
   */
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    
    return new Intl.NumberFormat('ko-KR', { 
      style: 'decimal'
    }).format(amount);
  }

  /**
   * 금액 형식화 (축약형, 예: 1.23조, 4.5억)
   * @param {number} amount - 금액
   * @returns {string} - 형식화된 금액
   */
  function formatCurrencyShort(amount) {
    if (amount === null || amount === undefined) return '-';

    if (Math.abs(amount) >= 1000000000000) {
      return (amount / 1000000000000).toFixed(1) + '조';
    } else if (Math.abs(amount) >= 100000000) {
      return (amount / 100000000).toFixed(1) + '억';
    } else if (Math.abs(amount) >= 10000) {
      return (amount / 10000).toFixed(1) + '만';
    } else {
      return new Intl.NumberFormat('ko-KR').format(amount);
    }
  }
}); 