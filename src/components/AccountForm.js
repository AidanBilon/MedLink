import React, { useEffect, useState, useCallback } from 'react';
import { Form, FormGroup, Label, Input, Button, Row, Col, Alert } from 'reactstrap';
import { loadProfile, saveProfile } from '../utils/profileStore';
import { useAuth0 } from '@auth0/auth0-react';

const defaultState = { firstName: '', lastName: '', phone: '', email: '', profilePicture: '' };

const AccountForm = () => {
  const { user } = useAuth0();
  const sub = user?.sub;
  const [values, setValues] = useState(defaultState);
  const [status, setStatus] = useState(null); // 'saved' | 'error'

  useEffect(() => {
    if (sub) {
      const existing = loadProfile(sub);
      if (existing) {
        setValues(v => ({ ...v, ...existing }));
      } else {
        // Attempt to infer first/last from user.name
        if (user?.name && !values.firstName && !values.lastName) {
          const parts = user.name.split(' ');
            setValues(v => ({
              ...v,
              firstName: parts[0] || '',
              lastName: parts.slice(1).join(' ') || ''
            }));
        }
      }
      // Always set email from auth profile if available and not yet set
      if (user?.email) {
        setValues(v => v.email ? v : { ...v, email: user.email });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues(v => ({ ...v, [name]: value }));
  };

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValues(v => ({ ...v, profilePicture: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = useCallback((e) => {
    e.preventDefault();
    if (!sub) return;
    try {
      saveProfile(sub, values);
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch (err) {
      setStatus('error');
    }
  }, [sub, values]);

  return (
    <div>
      <h4 className="mb-3">Account Details</h4>
      {status === 'saved' && <Alert color="success" fade>Saved.</Alert>}
      {status === 'error' && <Alert color="danger" fade>Error saving.</Alert>}
      <Form onSubmit={onSubmit}>
  <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="firstName">First Name</Label>
              <Input id="firstName" name="firstName" value={values.firstName} onChange={onChange} />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" value={values.lastName} onChange={onChange} />
            </FormGroup>
          </Col>
        </Row>
  <Row>
      <Col md={6}>
            <FormGroup>
              <Label for="phone">Phone</Label>
              <Input id="phone" name="phone" value={values.phone} onChange={onChange} />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
        <Label for="email">Email</Label>
        <Input id="email" name="email" type="email" value={values.email} onChange={onChange} disabled={!!user?.email} />
            </FormGroup>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={12}>
            <FormGroup>
              <Label for="profilePicture">Profile Picture</Label>
              <Input id="profilePicture" name="profilePicture" type="file" accept="image/*" onChange={onFileChange} />
              {values.profilePicture && (
                <div className="mt-2">
                  <img src={values.profilePicture} alt="Preview" style={{ maxWidth: '120px', borderRadius: '6px' }} />
                </div>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Button color="primary" type="submit">Save</Button>
      </Form>
    </div>
  );
};

export default AccountForm;
