import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Download, Radio } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../i18n';
import { freeTools, toolReleases, latestToolRelease, driveDownloadUrl } from '../data/freeTools';
import './free-tools.css';

function LatestDownload({ slug }: { slug: string }) {
  const { t } = useLanguage();
  const latest = latestToolRelease(slug);
  if (!latest) return <div className="tool-download"><button className="button button-secondary" type="button" disabled>{t('다운로드 준비 중')}</button><p>{t('다운로드 파일이 준비되면 이곳에서 최신 버전을 받을 수 있습니다.')}</p></div>;
  return <div className="tool-download"><a className="button button-primary" href={driveDownloadUrl(latest.driveFileId)!}><Download size={18} aria-hidden="true" />{t('최신 버전 다운로드')}</a><p>{t('최신 버전')} {latest.version}</p><p>{t('Google Drive의 권한 확인이나 보안 검사 화면이 표시될 수 있습니다.')}</p></div>;
}

export default function FreeTools() {
  const { t } = useLanguage();
  return <section id="free-tools" className="section free-tools-section" data-main-section tabIndex={-1} aria-labelledby="free-tools-heading">
    <div className="container">
      <div className="section-heading"><p className="section-kicker">FREE TOOLS</p><h2 id="free-tools-heading">{t('무료 도구')}</h2><p>{t('현장에서 필요한 무료 소프트웨어를 살펴보고, 프로그램별 다운로드와 변경 내역을 확인하세요.')}</p></div>
      <div className="tool-grid">{freeTools.map(tool => <article className="card tool-card" key={tool.slug}>
        <div className="card-icon"><Radio size={25} aria-hidden="true" /></div>
        <p className="tool-category">{t(tool.category)}</p><h3><a href={`#free-tools/${tool.slug}`}>{tool.name}</a></h3><p>{t(tool.description)}</p>
        <LatestDownload slug={tool.slug} />
        <a className="text-link" href={`#free-tools/${tool.slug}`}>{t('소개 및 변경 내역')}<ArrowRight size={17} aria-hidden="true" /></a>
      </article>)}</div>
    </div>
  </section>;
}

export function FreeToolDetail({ slug }: { slug: string }) {
  const { t, language } = useLanguage();
  const main = useRef<HTMLElement>(null);
  const tool = freeTools.find(item => item.slug === slug);
  const releases = (toolReleases[slug] ?? []).filter(release => driveDownloadUrl(release.driveFileId));
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.current?.focus({ preventScroll: true });
  }, [slug]);
  useEffect(() => { document.title = `${tool?.name ?? t('무료 도구')} | Oryx DataSafe`; }, [tool, language, t]);
  return <>
    <a className="skip-link" href="#tool-content" onClick={event => { event.preventDefault(); main.current?.focus(); }}>{t('본문 바로가기')}</a>
    <Navbar currentPath="free-tools" />
    <main id="tool-content" className="tool-detail" ref={main} tabIndex={-1}>
      <header className="page-hero"><div className="container">
        <a className="text-link tool-back" href="#free-tools"><ArrowLeft size={17} aria-hidden="true" />{t('무료 도구 목록')}</a>
        <p className="section-kicker">FREE TOOLS{tool ? ` · ${t(tool.category)}` : ''}</p>
        <h1 className="page-title">{tool?.name ?? t('프로그램을 찾을 수 없습니다.')}</h1>
        {tool && <><p className="tool-lead">{t(tool.description)}</p><LatestDownload slug={slug} /></>}
      </div></header>
      {tool && <section className="section" aria-labelledby="tool-changelog-heading"><div className="container tool-history">
        <div className="section-heading"><p className="section-kicker">RELEASE NOTES</p><h2 id="tool-changelog-heading">{t('변경 내역')}</h2><p>{t('버전별 추가·개선·수정 사항을 확인하세요.')}</p></div>
        {releases.length === 0 ? <p className="tool-empty">{t('확인된 릴리스 내역이 아직 없습니다. 배포 정보가 준비되면 안내합니다.')}</p> : <ol className="tool-releases">{releases.map(release => <li key={release.version}>
          <article><h3>{release.version}</h3>{release.releasedOn && <time dateTime={release.releasedOn}>{release.releasedOn}</time>}
            {(['added', 'improved', 'fixed'] as const).map(kind => release.changes[kind].length > 0 && <div key={kind} className="tool-change"><h4>{t({ added: '추가', improved: '개선', fixed: '수정' }[kind])}</h4><ul>{release.changes[kind].map(change => <li key={change}>{t(change)}</li>)}</ul></div>)}
          </article>
        </li>)}</ol>}
      </div></section>}
    </main><Footer />
  </>;
}
