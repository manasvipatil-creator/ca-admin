import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Navbar, Nav, Accordion } from 'react-bootstrap';
import {
    FiLayout, FiUsers, FiShield, FiTrendingUp, FiCheckCircle,
    FiFileText, FiBell, FiArrowRight, FiPieChart, FiCpu, FiMessageCircle,
    FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiMail
} from 'react-icons/fi';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        const reveal = () => {
            const reveals = document.querySelectorAll(".reveal");
            reveals.forEach(element => {
                const windowHeight = window.innerHeight;
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                if (elementTop < windowHeight - elementVisible) {
                    element.classList.add("active");
                }
            });
        };
        window.addEventListener("scroll", reveal);
        reveal(); // Initial check
        return () => window.removeEventListener("scroll", reveal);
    }, []);

    return (
        <div className="landing-page">
            <div className="grid-overlay"></div>
            {/* Animated Background Elements */}
            <div className="bg-shape shape-1"></div>
            <div className="bg-shape shape-2"></div>
            <div className="bg-shape shape-3"></div>

            {/* Navbar */}
            <Navbar expand="lg" className="navbar-custom fixed-top">
                <Container>
                    <Navbar.Brand href="#" className="brand-logo">
                        <div className="logo-icon me-2"><FiShield /></div>
                        <span>CA Vault</span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="mx-auto nav-links-center">
                            <Nav.Link href="#features">Features</Nav.Link>
                            <Nav.Link href="#how-it-works">Solutions</Nav.Link>
                            <Nav.Link href="#testimonials">Clients</Nav.Link>
                            <Nav.Link href="#pricing">Pricing</Nav.Link>
                        </Nav>
                        <Nav className="nav-btns">
                            <Button className="btn-login-transparent" onClick={() => navigate('/login')}>Login</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Hero Section */}
            <header className="hero-section">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6} className="hero-content reveal">
                            <div className="badge-premium mb-3">
                                <span className="badge-dot pulse"></span>
                                Trusted by 500+ Top CA Firms
                            </div>
                            <h1 className="hero-title">
                                Master Your Practice with <br />
                                <span className="text-gradient-fancy">Intelligent Automation</span>
                            </h1>
                            <p className="hero-subtitle">
                                The unified operating system for modern Chartered Accountants.
                                Secure document vaults, automated compliance, and real-time client collaboration.
                            </p>
                            <div className="hero-btns-v2">
                                <Button className="btn-secondary-outline" href="#features">
                                    Explore Solutions
                                </Button>
                            </div>
                            <div className="hero-trust-indicators d-flex mt-5 align-items-center gap-4">
                                <div className="trust-item">
                                    <FiCheckCircle className="text-primary" /> <span>Bank-Grade Security</span>
                                </div>
                                <div className="trust-item">
                                    <FiCheckCircle className="text-primary" /> <span>No Credit Card</span>
                                </div>
                            </div>
                        </Col>
                        <Col lg={6} className="position-relative reveal delay-2">
                            <div className="hero-visual-v2">
                                <div className="visual-backdrop"></div>
                                <div className="dashboard-mockup">
                                    <div className="mockup-header">
                                        <div className="header-dots"><span></span><span></span><span></span></div>
                                    </div>
                                    <div className="mockup-content">
                                        <div className="content-sidebar"></div>
                                        <div className="content-main">
                                            <div className="main-charts">
                                                <div className="chart-bar"></div>
                                                <div className="chart-bar"></div>
                                                <div className="chart-bar"></div>
                                            </div>
                                            <div className="main-rows">
                                                <div className="row-item"></div>
                                                <div className="row-item"></div>
                                                <div className="row-item"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="floating-card stat-one">
                                    <div className="card-icon blue"><FiUsers /></div>
                                    <div className="card-text">
                                        <div className="num">2.5k+</div>
                                        <div className="lab">Active Clients</div>
                                    </div>
                                </div>
                                <div className="floating-card stat-two">
                                    <div className="card-icon green"><FiTrendingUp /></div>
                                    <div className="card-text">
                                        <div className="num">99.9%</div>
                                        <div className="lab">Uptime Guarantee</div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </header>

            {/* Stats Section */}
            <section className="stats-strip reveal">
                <Container>
                    <div className="stats-flex">
                        <div className="stat-block">
                            <div className="stat-number">500+</div>
                            <div className="stat-label">CA Firms</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-block">
                            <div className="stat-number">15k+</div>
                            <div className="stat-label">Returns Filed</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-block">
                            <div className="stat-number">1M+</div>
                            <div className="stat-label">Files Secured</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-block">
                            <div className="stat-number">24/7</div>
                            <div className="stat-label">Expert Support</div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Features Section */}
            <section id="features" className="features-v3 py-100">
                <Container>
                    <div className="section-header text-center mb-5 reveal">
                        <h2 className="section-title-premium">Platform Features</h2>
                        <p className="section-subtitle-premium">Everything you need to run a high-performance CA practice.</p>
                    </div>

                    <Row className="g-4">
                        {[
                            { icon: <FiUsers />, title: "Digital Onboarding", desc: "Automated client KYC and onboarding workflows that save hours.", color: "blue" },
                            { icon: <FiShield />, title: "Secure Vault", desc: "Military-grade encryption for all financial and legal documents.", color: "purple" },
                            { icon: <FiBell />, title: "Auto Compliance", desc: "Smart alerts for GST, ITR, and ROC deadlines before they expire.", color: "green" },
                            { icon: <FiPieChart />, title: "Practice Analytics", desc: "Real-time visibility into firm revenue, growth, and team performance.", color: "orange" },
                            { icon: <FiCpu />, title: "AI Tax Prep", desc: "Intelligent suggestions for tax planning and error detection.", color: "red" },
                            { icon: <FiLayout />, title: "White-Label Portal", desc: "Give your clients a professional experience under your own brand.", color: "cyan" }
                        ].map((item, idx) => (
                            <Col lg={4} md={6} key={idx} className={`reveal delay-${(idx % 3) + 1}`}>
                                <div className="feature-card-v3">
                                    <div className={`feature-icon-wrapper ${item.color}`}>
                                        {item.icon}
                                    </div>
                                    <h4 className="feature-card-title">{item.title}</h4>
                                    <p className="feature-card-text">{item.desc}</p>
                                    <a href="#" className="feature-link">Learn More <FiArrowRight /></a>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="testimonials-v2 py-100">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={5} className="reveal">
                            <h2 className="testimonial-section-title">What Top CA Firms Are Saying</h2>
                            <p className="testimonial-section-desc">Join the community of forward-thinking accounting professionals.</p>
                            <div className="testimonial-rating mb-4">
                                <div className="stars">★★★★★</div>
                                <span className="ms-2">4.9/5 Average Rating</span>
                            </div>
                        </Col>
                        <Col lg={7}>
                            <div className="testimonial-slider reveal delay-2">
                                <div className="testimonial-item-v2">
                                    <p className="quote">"CA Vault has completely transformed how we handle our audits. The document management alone is worth the investment."</p>
                                    <div className="author-info">
                                        <div className="author-avatar blue">RK</div>
                                        <div className="author-details">
                                            <div className="name">Rajesh Khanna</div>
                                            <div className="role">Managing Partner, Khanna & Co.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Trust & Security Section */}
            <section className="security-section py-100 reveal">
                <Container>
                    <div className="security-banner-premium">
                        <Row className="align-items-center">
                            <Col lg={7}>
                                <div className="security-text-content">
                                    <div className="security-badge-v2"><FiShield className="me-2" /> Bank-Grade Security</div>
                                    <h2 className="security-title-v2">Your Practice Data, Protected.</h2>
                                    <p className="security-desc-v2">We employ AES-256 bit encryption, SOC 2 compliant data centers, and rigorous security protocols to ensure your sensitive financial data remains private and secure.</p>
                                    <div className="security-features-grid">
                                        <div className="sec-feat-item"><FiCheckCircle className="text-success me-2" /> Encrypted Backups</div>
                                        <div className="sec-feat-item"><FiCheckCircle className="text-success me-2" /> 2FA Authentication</div>
                                        <div className="sec-feat-item"><FiCheckCircle className="text-success me-2" /> Activity Logging</div>
                                        <div className="sec-feat-item"><FiCheckCircle className="text-success me-2" /> GDPR Compliant</div>
                                    </div>
                                </div>
                            </Col>
                            <Col lg={5}>
                                <div className="security-visual-premium">
                                    <div className="security-shield-icon">
                                        <FiShield />
                                    </div>
                                    <div className="trust-badges-v2">
                                        <div className="trust-badge">SSL SECURED</div>
                                        <div className="trust-badge">ISO 27001</div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="faq-v2 py-100">
                <Container>
                    <div className="section-header text-center mb-5 reveal">
                        <h2 className="section-title-premium">Common Questions</h2>
                        <p className="section-subtitle-premium">Everything you need to know about CA Vault.</p>
                    </div>
                    <Row className="justify-content-center">
                        <Col lg={8} className="reveal delay-2">
                            <Accordion defaultActiveKey="0" flush>
                                <Accordion.Item eventKey="0" className="premium-accordion-item">
                                    <Accordion.Header>How secure is my client data?</Accordion.Header>
                                    <Accordion.Body>
                                        We use enterprise-grade AES-256 encryption. Your data is stored in high-security data centers with multi-factor authentication and regular third-party audits.
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1" className="premium-accordion-item">
                                    <Accordion.Header>Can I collaborate with my team?</Accordion.Header>
                                    <Accordion.Body>
                                        Yes, our platform supports multi-user access with granular permission controls. Assign tasks, share documents, and track team progress in real-time.
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="2" className="premium-accordion-item">
                                    <Accordion.Header>Is there a mobile app available?</Accordion.Header>
                                    <Accordion.Body>
                                        CA Vault is fully responsive and can be used on any device. We also offer dedicated iOS and Android apps for on-the-go management.
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* CTA V2 */}
            <section className="cta-v2 reveal">
                <div className="cta-blob"></div>
                <Container>
                    <div className="cta-content-v2">
                        <h2 className="cta-title">Ready to modernize your practice?</h2>
                        <p className="cta-text">Join 500+ firms building the future of accounting with CA Vault.</p>
                        <div className="cta-actions">
                            <Button className="btn-cta-primary" onClick={() => navigate('/login')}>
                                Get Started Now <FiArrowRight className="ms-2" />
                            </Button>
                            <Button className="btn-cta-secondary ms-3">
                                Schedule a Demo
                            </Button>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Footer */}
            <footer className="footer-modern">
                <Container>
                    <Row className="footer-top-row">
                        <Col lg={4} md={6} className="mb-5 mb-lg-0 footer-brand-section">
                            <h4 className="footer-logo">CA Vault</h4>
                            <p className="footer-description">
                                The #1 Practice Management Software for Chartered Accountants.
                                We empower professionals with intelligent tools for document safety,
                                client synergy, and compliance mastery.
                            </p>
                            <div className="social-links-container">
                                <a href="#" className="social-link" aria-label="Facebook"><FiFacebook /></a>
                                <a href="#" className="social-link" aria-label="Twitter"><FiTwitter /></a>
                                <a href="#" className="social-link" aria-label="LinkedIn"><FiLinkedin /></a>
                                <a href="#" className="social-link" aria-label="Instagram"><FiInstagram /></a>
                            </div>
                        </Col>

                        <Col lg={2} md={3} xs={6} className="mb-4 mb-md-0">
                            <h6 className="footer-heading">Product</h6>
                            <ul className="footer-menu">
                                <li><a href="#features">Features</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Security</a></li>
                                <li><a href="#">Resource Center</a></li>
                            </ul>
                        </Col>

                        <Col lg={2} md={3} xs={6} className="mb-4 mb-md-0">
                            <h6 className="footer-heading">Company</h6>
                            <ul className="footer-menu">
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Press Kit</a></li>
                                <li><a href="#">Contact Support</a></li>
                            </ul>
                        </Col>

                        <Col lg={4} md={12} className="footer-newsletter-section">
                            <h6 className="footer-heading">Join Our Newsletter</h6>
                            <p className="footer-newsletter-text mb-4">Stay ahead with the latest compliance updates and professional tips.</p>
                            <div className="newsletter-input-group">
                                <input type="email" placeholder="Enter your email" className="newsletter-input" />
                                <button className="newsletter-btn">
                                    Subscribe <FiArrowRight className="ms-2" />
                                </button>
                            </div>
                        </Col>
                    </Row>

                    <div className="footer-bottom">
                        <div className="footer-bottom-content">
                            <p className="copyright-text">
                                &copy; {new Date().getFullYear()} CA Vault. All professional rights reserved.
                            </p>
                            <div className="footer-legal-links">
                                <a href="/privacy-policy">Privacy Policy</a>
                                <a href="#">Terms of Service</a>
                                <a href="#">Cookie Policy</a>
                            </div>
                        </div>
                    </div>
                </Container>
            </footer>
        </div>
    );
};

export default LandingPage;
