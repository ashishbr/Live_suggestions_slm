import styles from './PanelPrimitives.module.css'

export function ErrorBanner({ error }) {
  if (!error) return null
  return <div className={styles.errorBanner}>{error}</div>
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className={styles.emptyState}>
      <Icon size={32} className={styles.emptyIcon} />
      <p>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  )
}
