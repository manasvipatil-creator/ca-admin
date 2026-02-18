import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '40px 0' }}>
            <Container>
                <Button
                    variant="link"
                    className="mb-4 text-decoration-none text-muted"
                    onClick={() => navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    <FiArrowLeft /> Back to Home
                </Button>

                <Card className="border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                    <Card.Body className="p-5">
                        <h1 className="fw-bold mb-4">Privacy Policy</h1>
                        <p className="text-muted mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

                        <section className="mb-4">
                            <h4>1. Introduction</h4>
                            <p>
                                Welcome to CA Admin. We respect your privacy and are committed to protecting your personal data.
                                This privacy policy will inform you as to how we look after your personal data when you visit our website
                                and tell you about your privacy rights and how the law protects you.
                            </p>
                        </section>

                        <section className="mb-4">
                            <h4>2. Information We Collect</h4>
                            <p>
                                We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                            </p>
                            <ul>
                                <li>Identity Data includes first name, maiden name, last name, username or similar identifier.</li>
                                <li>Contact Data includes billing address, delivery address, email address and telephone numbers.</li>
                                <li>Technical Data includes internet protocol (IP) address, your login data, browser type and version.</li>
                            </ul>
                        </section>

                        <section className="mb-4">
                            <h4>3. How We Use Your Data</h4>
                            <p>
                                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                            </p>
                            <ul>
                                <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                                <li>Where we need to comply with a legal or regulatory obligation.</li>
                            </ul>
                        </section>

                        <section className="mb-4">
                            <h4>4. Data Security</h4>
                            <p>
                                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
                            </p>
                        </section>

                        <section>
                            <h4>5. Contact Us</h4>
                            <p>
                                If you have any questions about this privacy policy or our privacy practices, please contact us.
                            </p>
                        </section>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default PrivacyPolicy;
