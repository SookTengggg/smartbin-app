import { PAGES } from '../lib/nav'

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="flex flex-col gap-6 border-r border-[#16212A] bg-side px-3.5 py-6 text-[#DCE7EC] max-md:flex-row max-md:items-center max-md:gap-3 max-md:overflow-x-auto max-md:px-3 max-md:py-3">
      <div className="px-2.5 max-md:flex max-md:shrink-0 max-md:items-center max-md:gap-2 max-md:px-1">
        <img src="/logo.png" alt="" className="mb-3 h-[60px] w-[60px] drop-shadow-[0_0_14px_rgba(52,211,153,0.35)] max-md:mb-0 max-md:h-9 max-md:w-9" />
        <div className="font-head text-[21px] font-semibold max-md:text-[17px]">SmartBin</div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[#7C8F9B] max-md:hidden">Food waste tracking</div>
      </div>
      <nav className="flex flex-col gap-1 max-md:flex-row">
        {PAGES.map(({ id, label, icon: Icon }) => {
          const on = id === page
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={on ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-[9px] px-2.5 py-2.5 text-left ${
                on
                  ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.2),rgba(59,130,246,0.1))] font-medium text-white'
                  : 'text-[#A8B8C2] hover:bg-[#0E161D] hover:text-[#E9F1F5]'
              }`}
            >
              {on && (
                <span className="absolute -left-3.5 top-2 bottom-2 w-[3px] rounded-r bg-[linear-gradient(#34D399,#3B82F6)] shadow-[0_0_12px_#34D399] max-md:hidden" />
              )}
              <Icon size={18} strokeWidth={1.7} className={on ? 'text-[#34D399]' : ''} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
