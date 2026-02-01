const About = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">About Unjazz</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Unjazz is a modern music streaming platform built for sharing and discovering music.
            Stream high-quality audio with an intuitive, SoundCloud-inspired interface.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>High-quality audio streaming</li>
            <li>Visual waveform displays</li>
            <li>Continuous playback with playlist support</li>
            <li>Media controls integration (lock screen, keyboard shortcuts)</li>
            <li>Responsive design for all devices</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Technology</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Built with modern web technologies:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>React for UI components</li>
            <li>Howler.js for audio playback</li>
            <li>Tailwind CSS for styling</li>
            <li>Hosted on GitHub Pages</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="text-gray-300 leading-relaxed">
            For inquiries or feedback, please reach out through the GitHub repository.
          </p>
        </section>
      </div>
    </div>
  )
}

export default About
