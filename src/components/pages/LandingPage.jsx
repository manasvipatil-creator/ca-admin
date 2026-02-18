import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Navbar, Nav, Accordion } from 'react-bootstrap';
import {
    FiLayout, FiUsers, FiShield, FiTrendingUp, FiCheckCircle,
    FiFileText, FiBell, FiArrowRight, FiPieChart, FiCpu, FiMessageCircle
} from 'react-icons/fi';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* Animated Background Elements */}
            <div className="bg-shape shape-1"></div>
            <div className="bg-shape shape-2"></div>
            <div className="bg-shape shape-3"></div>

            {/* Navbar */}
            <Navbar expand="lg" className="navbar-custom fixed-top">
                <Container>
                    <Navbar.Brand href="#">CA Vault</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="mx-auto">
                            <Nav.Link href="#features">Features</Nav.Link>
                            <Nav.Link href="#how-it-works">How it Works</Nav.Link>
                            <Nav.Link href="#testimonials">Testimonials</Nav.Link>
                            <Nav.Link href="#faq">FAQ</Nav.Link>
                        </Nav>
                        <Nav>
                            <Button className="login-btn-nav" onClick={() => navigate('/login')}>
                                Client Login
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Hero Section */}
            <header className="hero-section">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6} className="hero-content">
                            <span className="section-label">All-in-One CA Practice Management</span>
                            <h1>Streamline Your CA Practice with <span className="text-gradient">Intelligent Tools</span></h1>
                            <p className="lead">
                                Manage clients, documents, compliance, and growth—all from a single, secure dashboard designed specifically for Chartered Accountants.
                            </p>
                            <div className="hero-btns">
                                <Button className="btn-primary-glow" onClick={() => navigate('/login')}>
                                    Get Started <FiArrowRight className="ms-2" />
                                </Button>
                                <Button className="btn-outline-custom" href="#features">
                                    Explore Features
                                </Button>
                            </div>
                            <div className="mt-5 d-flex gap-4 text-muted small">
                                <div className="d-flex align-items-center">
                                    <FiCheckCircle className="text-success me-2" /> No credit card needed
                                </div>
                                <div className="d-flex align-items-center">
                                    <FiCheckCircle className="text-success me-2" /> 14-day free trial
                                </div>
                            </div>
                        </Col>
                        <Col lg={6} className="position-relative">
                            <div className="hero-visual">
                                {/* Floating Stat 1 */}
                                <div className="stat-floating one">
                                    <div className="stat-icon bg-primary">
                                        <FiUsers />
                                    </div>
                                    <div>
                                        <div className="fw-bold fs-5">2,500+</div>
                                        <div className="text-muted small">Active Clients</div>
                                    </div>
                                </div>

                                {/* Floating Stat 2 */}
                                <div className="stat-floating two">
                                    <div className="stat-icon bg-success">
                                        <FiTrendingUp />
                                    </div>
                                    <div>
                                        <div className="fw-bold fs-5">98%</div>
                                        <div className="text-muted small">Efficiency Boost</div>
                                    </div>
                                </div>

                                <div className="dashboard-preview p-4">
                                    {/* Abstract UI Representation */}
                                    <div className="border-bottom pb-3 mb-3 d-flex justify-content-between">
                                        <div className="bg-light rounded" style={{ width: '120px', height: '20px' }}></div>
                                        <div className="d-flex gap-2">
                                            <div className="rounded-circle bg-light" style={{ width: '30px', height: '30px' }}></div>
                                            <div className="rounded-circle bg-light" style={{ width: '30px', height: '30px' }}></div>
                                        </div>
                                    </div>
                                    <Row className="g-3">
                                        <Col xs={4}>
                                            <div className="bg-light rounded p-3 h-100 d-flex flex-column align-items-center justify-content-center text-center">
                                                <FiPieChart size={24} className="text-primary mb-2" />
                                                <div className="bg-white mt-1 rounded" style={{ width: '40px', height: '8px' }}></div>
                                            </div>
                                        </Col>
                                        <Col xs={4}>
                                            <div className="bg-light rounded p-3 h-100 d-flex flex-column align-items-center justify-content-center text-center">
                                                <FiFileText size={24} className="text-success mb-2" />
                                                <div className="bg-white mt-1 rounded" style={{ width: '40px', height: '8px' }}></div>
                                            </div>
                                        </Col>
                                        <Col xs={4}>
                                            <div className="bg-light rounded p-3 h-100 d-flex flex-column align-items-center justify-content-center text-center">
                                                <FiUsers size={24} className="text-warning mb-2" />
                                                <div className="bg-white mt-1 rounded" style={{ width: '40px', height: '8px' }}></div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="mt-3 bg-light rounded p-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="bg-white rounded" style={{ width: '100px', height: '10px' }}></div>
                                            <div className="bg-white rounded" style={{ width: '40px', height: '10px' }}></div>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="bg-white rounded" style={{ width: '140px', height: '10px' }}></div>
                                            <div className="bg-white rounded" style={{ width: '40px', height: '10px' }}></div>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <div className="bg-white rounded" style={{ width: '90px', height: '10px' }}></div>
                                            <div className="bg-white rounded" style={{ width: '40px', height: '10px' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </header>

            {/* Stats Section */}
            <section className="stats-section">
                <Container>
                    <Row className="text-center">
                        <Col md={3} sm={6} className="stat-item mb-4 mb-md-0">
                            <h3>500+</h3>
                            <p>CA Firms</p>
                        </Col>
                        <Col md={3} sm={6} className="stat-item mb-4 mb-md-0">
                            <h3>15k+</h3>
                            <p>Tax Returns Filed</p>
                        </Col>
                        <Col md={3} sm={6} className="stat-item mb-4 mb-md-0">
                            <h3>1M+</h3>
                            <p>Documents Secured</p>
                        </Col>
                        <Col md={3} sm={6} className="stat-item">
                            <h3>24/7</h3>
                            <p>Premium Support</p>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <Container>
                    <div className="text-center mb-5">
                        <span className="section-label">Why Choose Us</span>
                        <h2 className="section-title">Powerful Features for Modern CAs</h2>
                        <p className="text-muted w-75 mx-auto">
                            Stop juggling multiple tools. Get everything you need to run your practice efficiently in one integrated platform.
                        </p>
                    </div>

                    <Row className="g-4">
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiUsers />
                                </div>
                                <h4>Client Management 360°</h4>
                                <p className="text-muted">
                                    Keep track of all client details, business structures, and compliance status in one organized view.
                                </p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiShield />
                                </div>
                                <h4>Bank-Grade Security</h4>
                                <p className="text-muted">
                                    Your data is encrypted with AES-256 bit encryption. Secure document vault for sensitive financial records.
                                </p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiBell />
                                </div>
                                <h4>Automated Reminders</h4>
                                <p className="text-muted">
                                    Never miss a deadline. Automated SMS and Email reminders for GST, ITR, and extensive compliance dates.
                                </p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiFileText />
                                </div>
                                <h4>Document Management</h4>
                                <p className="text-muted">
                                    Digitize your paperwork. Upload, organize, and share documents with clients securely in real-time.
                                </p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiCpu />
                                </div>
                                <h4>AI-Powered Insights</h4>
                                <p className="text-muted">
                                    Predictive analytics to track your firm's growth, revenue streams, and resource allocation.
                                </p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="feature-card-modern">
                                <div className="icon-box">
                                    <FiLayout />
                                </div>
                                <h4>Custom Reporting</h4>
                                <p className="text-muted">
                                    Generate beautiful, branded reports for your clients with a single click. Compliance status, tax summaries, and more.
                                </p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="reviews-section">
                <Container>
                    <div className="text-center mb-5">
                        <span className="section-label">Testimonials</span>
                        <h2 className="section-title">Trusted by Leading Firms</h2>
                    </div>
                    <Row className="g-4">
                        {[
                            {
                                name: "Rajesh Kumar",
                                role: "Senior Partner, Kumar & Associates",
                                text: "The efficiency we've gained since switching to this admin panel is incredible. It has cut our administrative time by 50%."
                            },
                            {
                                name: "Sneha Patel",
                                role: "CA, Patel Consultancy",
                                text: "Finally, a tool that understands the specific needs of Indian CAs. The compliance tracking is a life saver during audit season."
                            },
                            {
                                name: "Amit Sharma",
                                role: "Founder, FinTech Solutions",
                                text: "Secure, reliable, and easy to use. My clients love the transparency it provides. Highly recommended for any growing firm."
                            }
                        ].map((review, idx) => (
                            <Col md={4} key={idx}>
                                <div className="testimonial-card h-100">
                                    <p className="text-muted mb-4 relative" style={{ zIndex: 2 }}>"{review.text}"</p>
                                    <div className="d-flex align-items-center mt-auto">
                                        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                                            {review.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h6 className="mb-0 fw-bold">{review.name}</h6>
                                            <small className="text-muted">{review.role}</small>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="features-section bg-white">
                <Container>
                    <div className="text-center mb-5">
                        <span className="section-label">FAQ</span>
                        <h2 className="section-title">Common Questions</h2>
                    </div>
                    <Row className="justify-content-center">
                        <Col lg={8}>
                            <Accordion defaultActiveKey="0" flush>
                                <Accordion.Item eventKey="0" className="mb-3 border rounded border-light">
                                    <Accordion.Header>Is my data secure?</Accordion.Header>
                                    <Accordion.Body>
                                        Absolutely. We use enterprise-grade AES-256 encryption for all data at rest and in transit. Your client data is safe with us.
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1" className="mb-3 border rounded border-light">
                                    <Accordion.Header>Can I import existing client data?</Accordion.Header>
                                    <Accordion.Body>
                                        Yes, we offer easy bulk import tools for Excel and CSV files. Our support team can also assist you with migration.
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="2" className="mb-3 border rounded border-light">
                                    <Accordion.Header>Is there a mobile app?</Accordion.Header>
                                    <Accordion.Body>
                                        Our platform is fully responsive and works perfectly on all mobile devices and tablets, so you can manage your practice on the go.
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8} className="text-center relative" style={{ zIndex: 2 }}>
                            <h2 className="mb-4 display-5 fw-bold">Ready to Transform Your Practice?</h2>
                            <p className="lead mb-5 text-light opacity-75">
                                Join 500+ successful CA firms who have modernized their operations.
                                Start your journey today.
                            </p>
                            <Button size="lg" className="btn-primary-glow border-white bg-white text-primary" onClick={() => navigate('/login')}>
                                Access Dashboard
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Footer */}
            <footer className="footer-modern">
                <Container>
                    <Row>
                        <Col md={4} className="mb-4 mb-md-0">
                            <h4 className="text-white fw-bold mb-3">CA Vault</h4>
                            <p className="small">
                                The #1 Practice Management Software for Chartered Accountants.
                                simplifying compliance, documents, and client management.
                            </p>
                            <div className="d-flex gap-3 mt-4">
                                <a href="#" className="social-link"><FiMessageCircle /></a>
                                <a href="#" className="social-link"><FiUsers /></a>
                                <a href="#" className="social-link"><FiPieChart /></a>
                            </div>
                        </Col>
                        <Col md={2} xs={6} className="mb-4 mb-md-0">
                            <h6 className="footer-title">Product</h6>
                            <ul className="footer-links">
                                <li><a href="#features">Features</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Roadmap</a></li>
                                <li><a href="#">Updates</a></li>
                            </ul>
                        </Col>
                        <Col md={2} xs={6}>
                            <h6 className="footer-title">Company</h6>
                            <ul className="footer-links">
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Blog</a></li>
                                <li><a href="#">Contact</a></li>
                            </ul>
                        </Col>
                        <Col md={4}>
                            <h6 className="footer-title">Newsletter</h6>
                            <p className="small">Subscribe to our newsletter for the latest compliance updates and tips.</p>
                            <div className="d-flex gap-2">
                                <input type="email" placeholder="Email address" className="form-control bg-dark border-secondary text-white fs-6" />
                                <Button variant="primary">Join</Button>
                            </div>
                        </Col>
                    </Row>
                    <hr className="border-secondary my-5" />
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small">
                        <p className="mb-2 mb-md-0">&copy; {new Date().getFullYear()} CA Admin Portal. All rights reserved.</p>
                        <div className="d-flex gap-4">
                            <a href="/privacy-policy" className="text-decoration-none text-muted hover-white">Privacy Policy</a>
                            <a href="#" className="text-decoration-none text-muted hover-white">Terms of Service</a>
                            <a href="#" className="text-decoration-none text-muted hover-white">Cookie Policy</a>
                        </div>
                    </div>
                </Container>
            </footer>
        </div>
    );
};

export default LandingPage;
