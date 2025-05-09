import os
import sys
import time
import json
import base64
import traceback
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

# 결과 저장 폴더 생성
OUTPUT_DIR = "opgg_data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def crawl_opgg_main():
    """OP.GG 메인 페이지 크롤링"""
    print("OP.GG 메인 페이지 크롤링 중...")
    url = "https://www.op.gg/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"오류: 응답 코드 {response.status_code}")
        return None
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # HTML 저장
    with open(os.path.join(OUTPUT_DIR, "opgg_main.html"), "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    
    # 헤더 분석
    header = soup.select_one("header")
    if header:
        with open(os.path.join(OUTPUT_DIR, "header.html"), "w", encoding="utf-8") as f:
            f.write(header.prettify())
    
    # 네비게이션 메뉴 분석
    nav_elements = soup.select("nav")
    for i, nav in enumerate(nav_elements):
        with open(os.path.join(OUTPUT_DIR, f"nav_{i}.html"), "w", encoding="utf-8") as f:
            f.write(nav.prettify())
    
    # 검색창 분석
    search_elements = soup.select("form")
    for i, form in enumerate(search_elements):
        if form.find("input"):
            with open(os.path.join(OUTPUT_DIR, f"search_form_{i}.html"), "w", encoding="utf-8") as f:
                f.write(form.prettify())
    
    # CSS 스타일 추출
    style_tags = soup.select("style")
    css_data = ""
    for style in style_tags:
        css_data += style.text + "\n\n"
    
    with open(os.path.join(OUTPUT_DIR, "extracted_styles.css"), "w", encoding="utf-8") as f:
        f.write(css_data)
    
    # 링크된 CSS 파일 확인
    css_links = [link.get("href") for link in soup.select('link[rel="stylesheet"]')]
    with open(os.path.join(OUTPUT_DIR, "css_links.txt"), "w", encoding="utf-8") as f:
        for link in css_links:
            f.write(f"{link}\n")
    
    print(f"메인 페이지 크롤링 완료. 결과는 {OUTPUT_DIR} 폴더에 저장되었습니다.")
    return soup

def crawl_opgg_summoner():
    """OP.GG 소환사 페이지 크롤링 (레이아웃 참고용)"""
    print("OP.GG 소환사 페이지 크롤링 중...")
    url = "https://www.op.gg/summoners/kr/hide%20on%20bush"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"오류: 응답 코드 {response.status_code}")
        return None
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # HTML 저장
    with open(os.path.join(OUTPUT_DIR, "summoner_page.html"), "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    
    # 주요 컴포넌트 추출
    profile_section = soup.select_one('[class*="profile"]')
    if profile_section:
        with open(os.path.join(OUTPUT_DIR, "profile_section.html"), "w", encoding="utf-8") as f:
            f.write(profile_section.prettify())
    
    # 통계 섹션 추출
    stats_sections = soup.select('[class*="stats"], [class*="tier"], [class*="rank"]')
    for i, section in enumerate(stats_sections):
        with open(os.path.join(OUTPUT_DIR, f"stats_section_{i}.html"), "w", encoding="utf-8") as f:
            f.write(section.prettify())
    
    # 카드 컴포넌트 추출
    cards = soup.select('[class*="card"]')
    for i, card in enumerate(cards):
        with open(os.path.join(OUTPUT_DIR, f"card_{i}.html"), "w", encoding="utf-8") as f:
            f.write(card.prettify())
    
    print(f"소환사 페이지 크롤링 완료. 결과는 {OUTPUT_DIR} 폴더에 저장되었습니다.")
    return soup

def extract_colors(soup):
    """HTML에서 사용된 색상 코드 추출"""
    html_content = str(soup)
    import re
    
    # 색상 코드 패턴 (HEX, RGB, RGBA)
    color_patterns = [
        r'#[0-9a-fA-F]{3,6}',  # HEX 코드
        r'rgba?\([^)]+\)',      # RGB / RGBA 코드
    ]
    
    colors = set()
    for pattern in color_patterns:
        matches = re.findall(pattern, html_content)
        colors.update(matches)
    
    # 결과 저장
    with open(os.path.join(OUTPUT_DIR, "color_palette.txt"), "w", encoding="utf-8") as f:
        for color in colors:
            f.write(f"{color}\n")
    
    print(f"{len(colors)}개의 색상 코드를 추출했습니다.")

def analyze_layout_structure(soup):
    """페이지 레이아웃 구조 분석"""
    layout_info = {}
    
    # 주요 컨테이너 요소
    containers = soup.select('div[class*="container"]')
    layout_info["containers"] = len(containers)
    
    # 그리드 시스템 요소
    grid_elements = soup.select('[class*="row"], [class*="col"], [class*="grid"]')
    layout_info["grid_elements"] = len(grid_elements)
    
    # 카드 요소
    cards = soup.select('[class*="card"]')
    layout_info["cards"] = len(cards)
    
    # 테이블 요소
    tables = soup.select('table')
    layout_info["tables"] = len(tables)
    
    # 결과 저장
    with open(os.path.join(OUTPUT_DIR, "layout_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(layout_info, f, indent=2)
    
    print("레이아웃 구조 분석 완료")

def crawl_djmax_only():
    """DJMAX 트레이닝 플레이어 페이지만 크롤링"""
    OUTPUT_DIR = "djmax_data"
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("DJMAX 트레이닝 플레이어 페이지 크롤링 중...")
    url = "https://v-archive.net/training/player?v=2&name=%EA%B7%B8%20%EC%9D%B4%EC%83%81%ED%95%9C%EA%B1%B0&title=695&bpm=172.00&type=DJMAX&button=8&fp=2e50c207&enc=4eI5QIAq2BEGBcCH2IHoC.1Y161w2D2K1c2i2C36163U2D3s1c4G2C6C166a2D6y1c7M2C7k16882D8W1c8u2C9I169g2DA41cAS2CDw16EK2DEi1cF62CFU16Fs2DGG1cGe2CNE36.000_21A_51A_71A_81Y.CO0_21A_51A_71A_81A.Ia0_11Y_31Y_51Y_71Y_81Z.Ku0_21Y_41Y_61Y_71Y_81Y"
    options = Options()
    # 헤드리스 모드를 비활성화하여 실제 브라우저가 열리도록 함
    # options.add_argument('--headless')
    # options.add_argument('--disable-gpu')
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1200, 800)  # 브라우저 크기 설정
    driver.get(url)
    print("페이지 로드 중... 5초 대기")
    time.sleep(5)  # 더 긴 시간 대기하여 렌더링 보장

    # 전체 렌더링된 HTML 저장
    html = driver.page_source
    with open(os.path.join(OUTPUT_DIR, "djmax_training_rendered.html"), "w", encoding="utf-8") as f:
        f.write(html)
    
    print("HTML 저장 완료")

    # 전체 페이지 스크린샷 저장
    driver.save_screenshot(os.path.join(OUTPUT_DIR, "fullpage.png"))
    print("전체 페이지 스크린샷 저장 완료")

    # 캔버스 추출 (여러 개 있을 수 있으니 모두 저장)
    try:
        canvases = driver.find_elements(By.TAG_NAME, "canvas")
        print(f"발견된 캔버스 수: {len(canvases)}")
        for idx, canvas in enumerate(canvases):
            try:
                driver.execute_script("arguments[0].scrollIntoView();", canvas)
                time.sleep(0.5)  # 스크롤 후 잠시 대기
                img_b64 = driver.execute_script("return arguments[0].toDataURL('image/png').substring(22);", canvas)
                img_bytes = base64.b64decode(img_b64)
                with open(os.path.join(OUTPUT_DIR, f"canvas_{idx}.png"), "wb") as img_file:
                    img_file.write(img_bytes)
                print(f"캔버스 {idx} 저장 완료")
            except Exception as e:
                print(f"캔버스 {idx} 저장 실패: {e}")
    except Exception as e:
        print(f"캔버스 추출 중 오류: {e}")

    # 자바스크립트 추출
    soup = BeautifulSoup(html, "html.parser")
    # 1. 인라인 JS 추출
    inline_scripts = soup.find_all("script", src=False)
    with open(os.path.join(OUTPUT_DIR, "inline_scripts.js"), "w", encoding="utf-8") as f:
        for script in inline_scripts:
            if script.string:
                f.write(script.string)
                f.write("\n\n")
    print(f"인라인 스크립트 {len(inline_scripts)}개 저장 완료")
    
    # 2. 외부 JS 링크 추출 및 저장
    external_scripts = soup.find_all("script", src=True)
    for i, script in enumerate(external_scripts):
        src = script['src']
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = "https://v-archive.net" + src
        try:
            js_code = requests.get(src).text
            with open(os.path.join(OUTPUT_DIR, f"external_script_{i}.js"), "w", encoding="utf-8") as f:
                f.write(js_code)
            print(f"외부 스크립트 {i} ({src}) 저장 완료")
        except Exception as e:
            print(f"{src} 다운로드 실패: {e}")
    
    # HTML 구조 인덱스 추출
    html_index = []
    html_index.append("===== HTML 구조 인덱스 =====\n")
    
    # 주요 섹션과 요소들 추출
    html_index.append("\n--- 주요 섹션 ---\n")
    for tag in soup.find_all(['h1', 'h2', 'h3', 'section', 'div']):
        if tag.name in ['h1', 'h2', 'h3']:
            html_index.append(f"{tag.name.upper()}: {tag.get_text().strip()}")
        elif tag.get('id') or tag.get('class'):
            class_name = ' '.join(tag.get('class', [])) if tag.get('class') else ''
            id_name = tag.get('id', '')
            if class_name or id_name:
                html_index.append(f"DIV: id='{id_name}' class='{class_name}'")
    
    # 주요 UI 요소 추출
    html_index.append("\n--- 주요 UI 요소 ---\n")
    # 버튼
    buttons = soup.find_all(['button', 'input'])
    for button in buttons:
        if button.name == 'button' or button.get('type') == 'button':
            html_index.append(f"BUTTON: {button.get_text().strip() or button.get('value', '')}")
    
    # 폼
    forms = soup.find_all('form')
    for form in forms:
        html_index.append(f"FORM: action='{form.get('action', '')}' method='{form.get('method', '')}'")
    
    # 캔버스
    canvas_elements = soup.find_all('canvas')
    for i, canvas in enumerate(canvas_elements):
        html_index.append(f"CANVAS {i}: id='{canvas.get('id', '')}' class='{' '.join(canvas.get('class', []))}'")
    
    # HTML 인덱스 저장
    with open(os.path.join(OUTPUT_DIR, "html_index.txt"), "w", encoding="utf-8") as f:
        f.write('\n'.join(html_index))
    
    print("HTML 구조 인덱스 저장 완료")
    
    driver.quit()
    print(f"동적으로 생성된 전체 구조, 스크린샷, 자바스크립트 파일, HTML 인덱스를 {OUTPUT_DIR} 폴더에 저장했습니다.")
    
    # 저장된 파일 목록 출력
    files = os.listdir(OUTPUT_DIR)
    print("\n=== 저장된 파일 목록 ===")
    for file in files:
        print(f"- {file}")

def main():
    print("OP.GG 웹사이트 크롤링 시작")
    
    # 메인 페이지 크롤링
    main_soup = crawl_opgg_main()
    if main_soup:
        extract_colors(main_soup)
        analyze_layout_structure(main_soup)
    
    # 소환사 페이지 크롤링
    time.sleep(1)  # 서버 부하 방지
    summoner_soup = crawl_opgg_summoner()
    if summoner_soup:
        analyze_layout_structure(summoner_soup)
    
    # DJMAX 트레이닝 플레이어 페이지 크롤링
    crawl_djmax_only()
    
    print("\n크롤링 및 분석이 완료되었습니다.")
    print(f"모든 데이터는 {OUTPUT_DIR} 폴더에 저장되었습니다.")

if __name__ == "__main__":
    main()
