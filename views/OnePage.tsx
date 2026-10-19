import { ArrowRight, Check, LockKeyhole, ShieldCheck, Settings2 } from "lucide-react";
import { useLanguage } from "../i18n";
import Home from "./Home";
import DataStationPage from "./DataStation";
import CalibrationSection from "./Calibration";
import BrochuresPage from "./Brochures";
import FreeTools from "./FreeTools";
import { AboutSection, ContactSection, ImplementationSection, PrivacySection, ValidationSection } from "./SupportingSections";

export default function OnePage() {
  const { t } = useLanguage();
  return (
    <>
      <Home><AboutSection /></Home>
      <div id="datastation" data-main-section tabIndex={-1}><DataStationPage embedded /></div>
      <section id="lockdown" className="section lockdown-section" data-main-section tabIndex={-1} aria-labelledby="lockdown-heading">
        <div className="container">
          <div className="section-heading reveal"><p className="section-kicker">{t("ORYX LOCKDOWN · PC OPERATING ENVIRONMENT")}</p><h2 id="lockdown-heading" className="product-heading">Oryx LockDown</h2><p className="product-subtitle">{t("Windows 업무 PC 접근 관리")}</p><p>{t("Windows 로그인 후 전용 화면에서 허용된 업무 앱을 실행하고, 주요 접근 경로를 설정에 따라 제한합니다.")}</p></div>
          <div className="grid-3">
            <article className="card reveal"><div className="card-icon"><LockKeyhole size={25} aria-hidden="true" /></div><h3>{t("전용 운영 화면과 허용 앱")}</h3><p>{t("대상 사용자의 로그인 후 운영 화면을 전용 런처로 구성합니다. 관리자가 등록한 업무 앱을 선택·실행합니다.")}</p></article>
            <article className="card reveal"><div className="card-icon"><ShieldCheck size={25} aria-hidden="true" /></div><h3>{t("주요 접근 경로 제한")}</h3><p>{t("바탕화면, Windows 키·Alt+Tab, 작업 관리자와 실행 메뉴 접근을 설정에 따라 제한합니다. 모든 실행 파일과 우회 경로의 차단을 보장하지 않습니다.")}</p></article>
            <article className="card reveal"><div className="card-icon"><Settings2 size={25} aria-hidden="true" /></div><h3>{t("앱 실행과 관리자 복구")}</h3><p>{t("선택 앱의 자동 시작과 프로세스 종료 후 재시작을 지원합니다. 관리자 인증·셸 복원과 재부팅 절차는 현장 환경에서 확인합니다.")}</p></article>
          </div>
          <div className="lockdown-details reveal"><p><Check size={17} aria-hidden="true" />{t("계정·Windows 버전·업무 앱·연결 장치와 복구 절차를 도입 전에 확인합니다.")}</p><a className="text-link" href="#brochures">{t("LockDown 공식 소개서 보기")}<ArrowRight size={17} aria-hidden="true" /></a></div>
        </div>
      </section>
      <CalibrationSection />
      <FreeTools />
      <div id="brochures" data-main-section tabIndex={-1}><BrochuresPage embedded /></div>
      <ImplementationSection />
      <ValidationSection />
      <PrivacySection />
      <ContactSection />
    </>
  );
}
