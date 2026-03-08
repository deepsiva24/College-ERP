import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ChevronLeft, ChevronRight, Bell, Calendar, IndianRupee, Award, BookOpen } from 'lucide-react';

const SLIDES = [
    {
        url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=80',
        title: 'Welcome to Gurukul Campus',
        subtitle: 'Empowering minds, shaping futures',
    },
    {
        url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=1920&q=80',
        title: 'Central Library',
        subtitle: 'Over 50,000 volumes and digital resources',
    },
    {
        url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1920&q=80',
        title: 'Science & Research Labs',
        subtitle: 'State-of-the-art facilities for hands-on learning',
    },
    {
        url: 'https://images.unsplash.com/photo-1518605368461-1e1e11432da4?auto=format&fit=crop&w=1920&q=80',
        title: 'Sports & Athletics',
        subtitle: 'Championship-level grounds and training facilities',
    },
    {
        url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80',
        title: 'Graduation & Convocations',
        subtitle: 'Celebrating excellence and achievement',
    },
];

const NOTIFICATIONS = [
    { icon: '🔔', text: 'Last date for Term 2 fee payment: 15th March 2026', type: 'urgent' },
    { icon: '📝', text: 'Mid-semester examination schedule released — check the notice board', type: 'info' },
    { icon: '🏆', text: 'Annual Sports Meet 2026 registrations open — deadline 20th March', type: 'info' },
    { icon: '📅', text: 'Parent-Teacher meeting scheduled for 22nd March 2026', type: 'info' },
    { icon: '🎓', text: 'Convocation ceremony for 2025 batch on 28th March — RSVP required', type: 'urgent' },
    { icon: '📚', text: 'Library summer hours effective from 1st April — Mon-Sat 8AM to 8PM', type: 'info' },
    { icon: '🏅', text: 'Congratulations! Our students won 5 gold medals at Inter-University Tech Fest', type: 'info' },
    { icon: '⚠️', text: 'Campus will remain closed on 14th March (public holiday)', type: 'urgent' },
];

export default function DashboardView() {
    const user = useAuthStore((state) => state.user);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToSlide = useCallback((index: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentSlide(index);
        setTimeout(() => setIsTransitioning(false), 700);
    }, [isTransitioning]);

    const nextSlide = useCallback(() => {
        goToSlide((currentSlide + 1) % SLIDES.length);
    }, [currentSlide, goToSlide]);

    const prevSlide = useCallback(() => {
        goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length);
    }, [currentSlide, goToSlide]);

    // Auto-advance slideshow
    useEffect(() => {
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'User';

    return (
        <div className="w-full space-y-6">
            {/* Greeting Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {greeting}, <span className="text-indigo-600 capitalize">{firstName}</span> 👋
                    </h1>
                    <p className="mt-1 text-gray-500 text-lg">Here's what's happening at your campus today.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Calendar size={18} className="text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Scrolling Notification Ticker */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-lg">
                <div className="flex items-center px-4 py-3 gap-3">
                    <div className="flex-shrink-0 flex items-center gap-2 pr-4 border-r border-white/20">
                        <Bell size={18} className="text-yellow-300 animate-bounce" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider whitespace-nowrap">Notices</span>
                    </div>
                    <div className="overflow-hidden flex-1">
                        <div className="animate-marquee whitespace-nowrap flex gap-12">
                            {[...NOTIFICATIONS, ...NOTIFICATIONS].map((notif, idx) => (
                                <span key={idx} className="inline-flex items-center gap-2 text-sm text-white/95 font-medium">
                                    <span>{notif.icon}</span>
                                    <span>{notif.text}</span>
                                    <span className="text-white/30 ml-4">•</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Slideshow */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl group" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
                {/* Slides */}
                {SLIDES.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            }`}
                    >
                        <img
                            src={slide.url}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Slide Content */}
                        <div className={`absolute bottom-0 left-0 right-0 p-8 md:p-12 transition-all duration-700 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                            }`}>
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
                                {slide.title}
                            </h2>
                            <p className="text-lg md:text-xl text-white/80 font-medium drop-shadow-md">
                                {slide.subtitle}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Navigation Arrows */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/15 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-all duration-300 shadow-lg border border-white/10"
                    aria-label="Previous slide"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/15 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-all duration-300 shadow-lg border border-white/10"
                    aria-label="Next slide"
                >
                    <ChevronRight size={24} />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5">
                    {SLIDES.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`rounded-full transition-all duration-300 ${index === currentSlide
                                    ? 'w-8 h-3 bg-white shadow-lg'
                                    : 'w-3 h-3 bg-white/40 hover:bg-white/70'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Quick Action Cards (floating overlay) */}
                <div className="absolute top-4 right-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="px-4 py-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-white flex items-center gap-2 text-sm font-semibold shadow-lg">
                        <BookOpen size={16} />
                        <span>15 Courses</span>
                    </div>
                    <div className="px-4 py-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-white flex items-center gap-2 text-sm font-semibold shadow-lg">
                        <Award size={16} />
                        <span>50 Students</span>
                    </div>
                    <div className="px-4 py-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-white flex items-center gap-2 text-sm font-semibold shadow-lg">
                        <IndianRupee size={16} />
                        <span>Fee Status</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
