export function ProjectModal() {
  return (
    <div
      id="project-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden"
    >
      <div className="bg-gray-900 rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto p-8 m-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-2xl font-bold text-white">
            Project Details
          </h2>
          <button id="close-modal" type="button" className="text-gray-400 hover:text-white" aria-label="Close project details">
            <i className="fas fa-times text-xl" aria-hidden="true" />
          </button>
        </div>
        <div id="modal-content" className="text-white" />
      </div>
    </div>
  );
}
