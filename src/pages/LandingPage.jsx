import React, { useState } from 'react';
import {
  Leaf,
  Shield,
  Cloud,
  CreditCard,
  ArrowRight,
  Menu,
  X,
  PawPrint,
  Syringe,
  LineChart,
  Skull
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuthStore();
  const isAuthenticated = auth?.isAuthenticated;

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Leaf className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-primary">AgroGuardian AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium">How it Works</a>
            
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary transition-colors font-medium">Login</Link>
                <Link to="/register" className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 p-4 space-y-4">
          <a href="#features" className="block text-gray-600 hover:text-primary px-4 py-2 font-medium text-center">Features</a>
          <a href="#how-it-works" className="block text-gray-600 hover:text-primary px-4 py-2 font-medium text-center">How it Works</a>
          
          {isAuthenticated ? (
            <Link to="/dashboard" className="block bg-primary text-white px-4 py-3 rounded-xl font-semibold text-center">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="block text-gray-600 hover:text-primary px-4 py-2 font-medium text-center">Login</Link>
              <Link to="/register" className="block bg-primary text-white px-4 py-3 rounded-xl font-semibold text-center">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group"
  >
    <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
      <Icon className="text-primary h-7 w-7 group-hover:text-white transition-colors" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  const auth = useAuthStore();
  const isAuthenticated = auth?.isAuthenticated;


  return (
    <div className="min-h-screen bg-[#FDFCF0]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                AI-Powered Agriculture
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-8">
                Empowering Farmers with <span className="text-primary italic">AI Precision</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl">
                AgroGuardian AI helps you manage crops and livestock: track animal health, due vaccinations, inventory & profit, weather risks, and sustainability in one dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  to={isAuthenticated ? "/dashboard" : "/register"} 
                  className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Your Farm"}
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center">
                  Explore Features
                </a>
              </div>
            </motion.div>
          </div>
          <div className="flex-1 w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl -z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=800" 
                alt="Modern Farming" 
                className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Syringe className="text-green-600 h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Upcoming Care</p>
                  <p className="text-lg font-bold text-gray-900">Vaccinations & Deworming</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Core Features</h2>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">Built for Real Farm Operations</h2>
            <p className="text-gray-600 text-lg mt-4 max-w-3xl mx-auto">
              From livestock health to farm finances—AgroGuardian AI helps you run day-to-day operations and make better decisions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={PawPrint}
              title="Livestock Management"
              description="Register individuals and batches (poultry/fish), track status, growth, breeding, and feeding."
              delay={0.1}
            />
            <FeatureCard
              icon={Syringe}
              title="Health & Due Alerts"
              description="Log vaccinations and deworming, and get reminders when care is due—so nothing is missed."
              delay={0.2}
            />
            <FeatureCard
              icon={LineChart}
              title="Inventory & Finance"
              description="Track purchases, sales, estimated value, and net profit with clear farm-level summaries."
              delay={0.3}
            />
            <FeatureCard
              icon={Skull}
              title="Mortality & Loss Tracking"
              description="Log deaths and losses (including batch quantity changes) to keep inventory and profit accurate."
              delay={0.4}
            />
            <FeatureCard
              icon={Leaf}
              title="AI Diagnosis"
              description="Get AI help for crop disease identification and general farm guidance when issues show up."
              delay={0.5}
            />
            <FeatureCard
              icon={Cloud}
              title="Weather Risks"
              description="Real-time weather monitoring and predictive risk analysis tailored to your farm's location."
              delay={0.6}
            />
            <FeatureCard
              icon={Shield}
              title="Climate Resilience"
              description="Track resilience scores and improve your farm's readiness for climate changes over time."
              delay={0.7}
            />
            <FeatureCard
              icon={CreditCard}
              title="Carbon Credits"
              description="Monetize sustainable practices by generating and tracking carbon credits in one place."
              delay={0.8}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <img 
                src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800" 
                alt="Farmer using app" 
                className="rounded-3xl shadow-2xl"
              />
            </div>
            <div className="flex-1 space-y-12">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Simple Steps to Smarter Farming</h2>
                <p className="text-gray-600 text-lg">We've made it easy to integrate AI into your daily farming routine.</p>
              </div>

              {[
                { step: "01", title: "Register Your Farm", desc: "Add your farm profile and location to unlock personalized insights." },
                { step: "02", title: "Add Livestock & Crops", desc: "Register animals (individuals or batches) and manage your farm activities." },
                { step: "03", title: "Log Health & Get Alerts", desc: "Record vaccinations/deworming and get due reminders to prevent outbreaks." },
                { step: "04", title: "Track Value & Profit", desc: "Monitor inventory, sales, losses, and net profit with simple summaries." }
              ].map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="text-4xl font-bold text-primary/20 leading-none">{item.step}</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="text-primary h-8 w-8" />
              <span className="text-3xl font-bold">AgroGuardian AI</span>
            </div>
            <p className="text-gray-400 max-w-sm mb-8">
              All-in-one farm operations: livestock health, inventory & profit, weather risk insights, and sustainability tracking.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a></li>
              <li>
                <Link to={isAuthenticated ? "/dashboard" : "/register"} className="hover:text-primary transition-colors">
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-gray-800 text-center text-gray-500">
          © 2026 AgroGuardian AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
