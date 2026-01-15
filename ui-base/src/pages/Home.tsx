/* eslint-disable @typescript-eslint/no-unused-vars */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Meteors } from "@/components/magicui/meteors";
import { AuroraText } from "@/components/magicui/aurora-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Marquee } from "@/components/magicui/marquee";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useTheme } from "@/components/providers";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSEO } from "@/hooks";
import { StructuredData, defaultOrganizationData, defaultWebSiteData } from "@/components/seo";
import {
  Mail,
  Zap,
  BarChart3,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Play,
  Settings,
  Eye,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { PricingCalculatorModal } from "@/components/pricing/PricingCalculatorModal";

// Header Component
function Header() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = () => {
    navigate("/get-started");
  };

  const handleGetStarted = () => {
    navigate("/get-started");
  };

  const navigation = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "Documentation", href: "/documentation" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer p-0 m-0">
            <img 
              src="/brand/63.svg" 
              alt="Inboz Logo" 
              className="h-32 w-32 object-contain dark:brightness-0 dark:invert transition-all p-0 m-0"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer"
                onClick={(e) => {
                  if (item.href.startsWith("/")) {
                    // Route navigation
                    e.preventDefault();
                    navigate(item.href);
                  } else {
                    // Scroll to section
                    e.preventDefault();
                    const targetId = item.href.substring(1);
                    const element = document.getElementById(targetId);
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }
                }}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Sign In button hidden as requested */}
            {/* <Button
              variant="ghost"
              onClick={handleLogin}
              className="text-muted-foreground cursor-pointer"
            >
              Sign In
            </Button> */}
            <Button onClick={handleGetStarted} className="cursor-pointer">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden py-4 border-t border-border"
          >
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    if (item.href.startsWith("/")) {
                      // Route navigation
                      navigate(item.href);
                    } else {
                      // Scroll to section
                      const targetId = item.href.substring(1);
                      const element = document.getElementById(targetId);
                      if (element) {
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }
                  }}
                >
                  {item.name}
                </a>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                {/* Mobile Theme Toggle */}
                <div className="flex justify-start">
                  <ThemeToggle />
                </div>

                {/* Sign In button hidden as requested */}
                {/* <Button
                  variant="ghost"
                  onClick={handleLogin}
                  className="text-muted-foreground cursor-pointer"
                >
                  Sign In
                </Button> */}
                <Button onClick={handleGetStarted} className="cursor-pointer">
                  Get Started
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
}

// Footer Component
function Footer() {
  const navigate = useNavigate();

  const footerLinks = [
    { name: "Terms", href: "/terms-and-conditions" },
    { name: "Privacy", href: "/privacy-policy" },
    { name: "Support", href: "/support" },
    { name: "Documentation", href: "/documentation" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="w-full px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          {/* Logo on Left */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Inboz</span>
          </div>

          {/* Copyright Centered */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
            <p className="text-muted-foreground text-sm">
              © 2026 Inboz. All rights reserved.
            </p>
          </div>
          <div className="text-center md:hidden">
            <p className="text-muted-foreground text-sm">
              © 2026 Inboz. All rights reserved.
            </p>
          </div>

          {/* Links on Right */}
          <div className="flex items-center gap-4 md:gap-6 flex-wrap justify-center">
            {footerLinks.map((link) => (
              <div key={link.name}>
                {link.href.startsWith("/") ? (
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.href);
                    }}
                  >
                    {link.name}
                  </a>
                ) : (
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer text-sm"
                    onClick={(e) => {
                      if (link.href.startsWith("#")) {
                        e.preventDefault();
                        const targetId = link.href.substring(1);
                        const element = document.getElementById(targetId);
                        if (element) {
                          element.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }
                    }}
                  >
                    {link.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Animated Counter Component
function AnimatedCounter({
  value,
  suffix = "",
}: {
  value: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Extract numeric value from string
  const getNumericValue = (val: string) => {
    const match = val.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const numericValue = getNumericValue(value);
  const unit = value.replace(/\d+\.?\d*/, "");

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const duration = 3500; // 3.5 seconds - slower

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = numericValue * easeProgress;

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, numericValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setIsVisible(true)}
      transition={{ duration: 0.8 }}
      className="text-2xl font-bold text-foreground"
    >
      {Math.round(count)}
      {unit}
      {suffix}
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [isPricingCalculatorOpen, setIsPricingCalculatorOpen] = useState(false);

  // SEO configuration for homepage
  useSEO({
    title: "Inboz - Email Campaign Management Platform for Organizations",
    description:
      "Comprehensive email campaign management platform for organizations. Manage contacts, email campaigns, templates, analytics, and more with our powerful system.",
    keywords:
      "email marketing, campaign management, email campaigns, contact management, CRM, email automation, marketing automation",
    canonicalUrl: "https://inboz.io/",
  });

  const handleTryNow = () => {
    navigate("/get-started");
  };

  const handleGetStarted = () => {
    navigate("/get-started");
  };


  const painPoints = [
    {
      icon: TrendingUp,
      title: "Emails Nobody Opens",
      description:
        "Spending hours creating emails that nobody opens or engages with.",
    },
    {
      icon: Settings,
      title: "Complex Tools",
      description:
        "Complex tools that require technical skills you don't have or want to learn.",
    },
    {
      icon: Eye,
      title: "Boring Templates",
      description:
        "Boring templates that look like every other business in your industry.",
    },
    {
      icon: Mail,
      title: "Poor Deliverability",
      description:
        "Poor deliverability - your emails end up in spam folders instead of inboxes.",
    },
    {
      icon: BarChart3,
      title: "No Clear Results",
      description:
        "No clear results - you can't tell what's working and what's not.",
    },
  ];

  const benefits = [
    {
      icon: Mail,
      title: "Beautiful Emails in Minutes",
      description:
        "Professional templates that convert - no design skills needed. 100+ mobile-responsive templates with drag-and-drop editor anyone can use.",
    },
    {
      icon: Zap,
      title: "Automation That Works While You Sleep",
      description:
        "Set it and forget it sequences that turn subscribers into customers. Welcome series, abandoned cart recovery, birthday campaigns, and lead nurturing.",
    },
    {
      icon: BarChart3,
      title: "Analytics That Matter",
      description:
        "Track opens, clicks, and sales - not vanity metrics. Real-time performance dashboards with revenue attribution tracking and A/B testing built-in.",
    },
    {
      icon: TrendingUp,
      title: "Higher Open Rates Guaranteed",
      description:
        "Our customers see average 30% higher open rates. Advanced deliverability optimization with send time optimization and subject line AI suggestions.",
    },
  ];

  const testimonials = [
    {
      result: "250%",
      company: "Sarah Chen, E-commerce Director",
      description:
        "Increased our email revenue by 250% in just 3 months. The automation features are game-changing.",
      rating: "⭐⭐⭐⭐⭐",
      companyName: "GrowthCo",
    },
    {
      result: "45%",
      company: "Mark Rodriguez, Marketing Manager",
      description:
        "Finally, an email tool that actually works. Our open rates went from 18% to 45%.",
      rating: "⭐⭐⭐⭐⭐",
      companyName: "TechStart",
    },
    {
      result: "300%",
      company: "Lisa Thompson, CEO",
      description:
        "300% ROI increase in first 90 days. Best investment we've made in our marketing.",
      rating: "⭐⭐⭐⭐⭐",
      companyName: "StartupX",
    },
    {
      result: "99.9%",
      company: "David Kim, CTO",
      description:
        "99.9% uptime guaranteed. Never worry about email delivery again.",
      rating: "⭐⭐⭐⭐⭐",
      companyName: "EcomPlus",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background text-foreground pt-36 pb-20 lg:pt-44 lg:pb-32">
        {/* Meteors Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Meteors
            number={20}
            minDelay={0.2}
            maxDelay={1.2}
            minDuration={2}
            maxDuration={10}
            angle={215}
          />
        </div>
        <div className="w-full px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Turn Your Email List
                </span>
                <br />
                <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Into a{" "}
                </span>
                <AuroraText className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold">
                  Revenue Machine
                </AuroraText>
              </motion.h1>

              <motion.p
                className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                All-in-one email marketing platform with drag-and-drop builder,
                smart automation, and analytics that actually matter. No coding
                required.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
              >
                <ShimmerButton
                  className="shadow-2xl"
                  shimmerSize="0.15em"
                  onClick={handleTryNow}
                >
                  <span className="text-center text-sm leading-none font-medium tracking-tight whitespace-pre-wrap text-white lg:text-lg dark:from-white dark:to-slate-900/10">
                    Start Your Free Trial
                  </span>
                </ShimmerButton>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-4 border-border text-foreground hover:bg-accent cursor-pointer"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </motion.div>

              {/* Supporting Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-8 text-sm text-muted-foreground px-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  7-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Cancel anytime
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex justify-center items-center gap-6 sm:gap-8 lg:gap-12 mt-16 px-4"
              >
                <div className="text-center">
                  <AnimatedCounter value="5K+" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Businesses
                  </p>
                </div>
                <div className="text-center">
                  <AnimatedCounter value="1M+" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Emails Sent
                  </p>
                </div>
                <div className="text-center">
                  <AnimatedCounter value="30%" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Open Rate
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem/Pain Point Section */}
      <section className="py-20 bg-background">
        <div className="w-full px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Tired of Email Marketing That Doesn't Work?
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              What if you could create professional email campaigns that
              actually drive sales - in just minutes?
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {painPoints.map((pain, index) => (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <pain.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  {pain.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {pain.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution/Benefits Section */}
      <section id="how-it-works" className="py-20 bg-background scroll-mt-16">
        <div className="w-full px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Email Marketing That Actually Grows Your Business
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Professional email campaigns that convert visitors into customers
              on autopilot.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-background">
        <div className="w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Join 50,000+ Businesses Growing With Inboz
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real results from real customers who've transformed their email
              marketing.
            </p>
          </motion.div>

          <Marquee className="py-8" pauseOnHover={true}>
            {testimonials.map((testimonial) => (
              <div key={testimonial.company} className="text-center mx-4">
                <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow bg-card p-6 w-80">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {testimonial.result}
                  </div>
                  <div className="text-lg font-semibold text-foreground mb-1">
                    {testimonial.company}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {testimonial.companyName}
                  </div>
                  <div className="text-2xl mb-3 text-foreground">★★★★★</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {testimonial.description}
                  </p>
                </Card>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Final CTA Section */}
      <BackgroundLines className="py-20 min-h-[600px] flex items-center justify-center">
        <div className="w-full px-6 relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Start Your Email Empire Today
                </span>
              </h2>
              <div className="flex flex-wrap justify-center gap-6 mb-4 text-xl text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                  Enterprise-Grade Security
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                  99.9% Uptime Guarantee
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-lg text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-foreground" />
                  Free Setup
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-foreground" />
                  24/7 Expert Support
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-foreground" />
                  Advanced Analytics
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex justify-center"
              >
                <ShimmerButton
                  className="shadow-2xl"
                  shimmerSize="0.15em"
                  onClick={handleTryNow}
                >
                  <span className="text-center text-sm leading-none font-medium tracking-tight whitespace-pre-wrap text-white lg:text-lg dark:from-white dark:to-slate-900/10">
                    Get Started
                  </span>
                </ShimmerButton>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </BackgroundLines>

      {/* Features Showcase Section */}
      <section id="features" className="py-20 bg-background scroll-mt-16">
        <div className="w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Everything You Need to Succeed
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make email marketing simple and
              effective.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                Smart Email Builder
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Visual drag-and-drop editor</li>
                <li>100+ proven templates</li>
                <li>Mobile optimization automatic</li>
                <li>Image library included</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                Marketing Automation
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Behavioral triggers</li>
                <li>Drip campaigns</li>
                <li>Segmentation tools</li>
                <li>Lead scoring</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                Advanced Analytics
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Revenue tracking</li>
                <li>Conversion attribution</li>
                <li>A/B testing</li>
                <li>Deliverability monitoring</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Settings className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                CRM Integration
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Two-way contact sync</li>
                <li>Automated workflow triggers</li>
                <li>Real-time data alignment</li>
                <li>Seamless platform connection</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background scroll-mt-16">
        <div className="w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Plans That Grow With Your Business
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with a 7-day free trial and scale as you grow. Per-user pricing with volume discounts.
            </p>
          </motion.div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <Button
              variant={billingCycle === "MONTHLY" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("MONTHLY")}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "YEARLY" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("YEARLY")}
              className="relative"
            >
              Yearly
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                Save 2 months
              </span>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">Starter</h3>
                  <div className="text-4xl font-bold mb-2">
                    ${billingCycle === "YEARLY" ? "290" : "29"}
                    <span className="text-lg text-muted-foreground">
                      /user/{billingCycle === "YEARLY" ? "year" : "month"}
                    </span>
                  </div>
                  {billingCycle === "YEARLY" && (
                    <p className="text-sm text-muted-foreground mb-4">
                      ${(290 / 12).toFixed(2)}/user/month
                    </p>
                  )}
                  <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
                    <li>✓ 300 emails per day per user</li>
                    <li>✓ Basic analytics</li>
                    <li>✓ Campaign templates</li>
                    <li>✓ Contact management</li>
                    <li>✓ Basic reporting</li>
                    <li>✓ Email support</li>
                    <li className="pt-2 text-xs text-muted-foreground/80">
                      Volume discounts: 10% (5-10 users), 15% (11-25), 20% (26-50)
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={handleTryNow}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="h-full border-2 border-primary shadow-md relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="text-4xl font-bold mb-2">
                    ${billingCycle === "YEARLY" ? "390" : "39"}
                    <span className="text-lg text-muted-foreground">
                      /user/{billingCycle === "YEARLY" ? "year" : "month"}
                    </span>
                  </div>
                  {billingCycle === "YEARLY" && (
                    <p className="text-sm text-muted-foreground mb-4">
                      ${(390 / 12).toFixed(2)}/user/month
                    </p>
                  )}
                  <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
                    <li>✓ 600 emails per day per user</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ A/B testing</li>
                    <li>✓ Automation features</li>
                    <li>✓ Advanced reporting</li>
                    <li>✓ Priority support</li>
                    <li>✓ Integrations</li>
                    <li className="pt-2 text-xs text-muted-foreground/80">
                      Volume discounts: 10% (5-10 users), 15% (11-25), 20% (26-50)
                    </li>
                  </ul>
                  <Button
                    className="w-full cursor-pointer"
                    onClick={handleTryNow}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Scale Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">Scale</h3>
                  <div className="text-4xl font-bold mb-2">
                    ${billingCycle === "YEARLY" ? "490" : "49"}
                    <span className="text-lg text-muted-foreground">
                      /user/{billingCycle === "YEARLY" ? "year" : "month"}
                    </span>
                  </div>
                  {billingCycle === "YEARLY" && (
                    <p className="text-sm text-muted-foreground mb-4">
                      ${(490 / 12).toFixed(2)}/user/month
                    </p>
                  )}
                  <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
                    <li>✓ 1,000 emails per day per user</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Custom integrations</li>
                    <li>✓ API access</li>
                    <li>✓ White label options</li>
                    <li>✓ Phone support</li>
                    <li>✓ Dedicated account manager</li>
                    <li className="pt-2 text-xs text-muted-foreground/80">
                      Volume discounts: 10% (5-10 users), 15% (11-25), 20% (26-50)
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={handleTryNow}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Volume Discount Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 text-center space-y-2"
          >
            <p className="text-sm text-muted-foreground">
              Need more than 50 users? <a href="mailto:support@inboz.io" className="text-primary cursor-pointer hover:underline">Contact Sales</a>
            </p>
            <p className="text-sm text-muted-foreground">
              Want to calculate your exact pricing?{" "}
              <span 
                className="text-primary cursor-pointer hover:underline" 
                onClick={() => setIsPricingCalculatorOpen(true)}
              >
                Use our Pricing Calculator
              </span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-background scroll-mt-16">
        <div className="w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about getting started with Inboz.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    Do I need technical skills to use this?
                  </h3>
                  <p className="text-muted-foreground">
                    Not at all! Our drag-and-drop editor is designed for anyone
                    to use. If you can use email, you can create professional
                    campaigns with us.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    How quickly can I get started?
                  </h3>
                  <p className="text-muted-foreground">
                    You can send your first email in under 10 minutes. Our setup
                    wizard guides you through everything.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    What if I'm not satisfied?
                  </h3>
                  <p className="text-muted-foreground">
                    We offer a 30-day money-back guarantee. Plus, you can cancel
                    anytime - no contracts or hidden fees.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    Do my emails actually reach the inbox?
                  </h3>
                  <p className="text-muted-foreground">
                    Yes! We maintain 99%+ deliverability rates with dedicated IP
                    warming and spam filter testing.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    Can I import my existing subscribers?
                  </h3>
                  <p className="text-muted-foreground">
                    Absolutely! Import from any platform - we'll help you
                    migrate everything safely and maintain compliance.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Pricing Calculator Modal */}
      <PricingCalculatorModal
        open={isPricingCalculatorOpen}
        onOpenChange={setIsPricingCalculatorOpen}
      />

      {/* Structured Data for SEO */}
      <StructuredData data={defaultOrganizationData} id="organization-data" />
      <StructuredData data={defaultWebSiteData} id="website-data" />
    </div>
  );
}
