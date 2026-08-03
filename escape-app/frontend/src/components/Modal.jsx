export default function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-3xl md:m-auto md:max-h-[85vh] animate-[slideUp_0.3s_ease]">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <i className="fas fa-times text-gray-600"></i>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}

