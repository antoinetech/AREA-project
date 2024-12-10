import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Space,
  Button,
  message,
  Layout,
  Row,
  Col,
  Modal,
  Input,
  Form,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import axios from "axios";
import AppLayout from "./AppLayout";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Importer useTranslation

import microsoftLogo from "../assets/microsoft.webp";
import githubLogo from "../assets/github.png";
import spotifyLogo from "../assets/spotify.webp";
import discordLogo from "../assets/Discord_Logo.png";
import miroLogo from "../assets/miro.png";
import twitterLogo from "../assets/twitter.webp";
import twitchLogo from "../assets/twitch.webp";

const { Text } = Typography;
const { Content } = Layout;

const AVAILABLE_SERVICES = [
  { name: "Microsoft", image: microsoftLogo },
  { name: "Github", image: githubLogo },
  { name: "Spotify", image: spotifyLogo },
  { name: "Discord", image: discordLogo },
  { name: "Miro", image: miroLogo },
  { name: "Twitter", image: twitterLogo },
  { name: "Twitch", image: twitchLogo },
];

const getServiceNameForDatabase = (serviceName) => {
  const serviceMap = {
    Microsoft: ["Outlook", "Microsoft-Calendar"],
    Github: "Github",
    Spotify: "Spotify",
    Discord: "Discord",
    Miro: "Miro",
    Twitter: "Twitter",
    Twitch: "Twitch",
  };
  return serviceMap[serviceName] || serviceName;
};

const ProfilePage = () => {
  const { t } = useTranslation(); // Utiliser useTranslation
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");
  const [apiSettings, setApiSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isEditFirstNameModalVisible, setIsEditFirstNameModalVisible] =
    useState(false);
  const [isEditLastNameModalVisible, setIsEditLastNameModalVisible] =
    useState(false);
  const [isEditPasswordModalVisible, setIsEditPasswordModalVisible] =
    useState(false);
  const [isServiceLogoutModalVisible, setIsServiceLogoutModalVisible] =
    useState(false);
  const [isDeleteSubscriptionModalVisible, setIsDeleteSubscriptionModalVisible] =
    useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const navigate = useNavigate();
  const [firstNameForm] = Form.useForm();
  const [lastNameForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (token) {
      fetchUserInfo();
      fetchUserSubscriptions();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-logged`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      message.error(t('messages.fetchUserInfoError'));
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const subscriptions = response.data || [];

      const updatedSettings = AVAILABLE_SERVICES.reduce((acc, service) => {
        const serviceName = getServiceNameForDatabase(service.name);
        acc[service.name] = subscriptions.some(
          (sub) => sub.serviceId.name === serviceName
        );
        return acc;
      }, {});

      setApiSettings(updatedSettings);
    } catch (error) {
      console.error("Error fetching user subscriptions:", error);
      message.error(t('messages.fetchSubscriptionsError'));
    } finally {
      setIsLoading(false);
    }
  };

  const showEditFirstNameModal = () => {
    setIsEditFirstNameModalVisible(true);
    firstNameForm.setFieldsValue({
      firstName: user?.name,
    });
  };

  const showEditLastNameModal = () => {
    setIsEditLastNameModalVisible(true);
    lastNameForm.setFieldsValue({
      lastName: user?.surname,
    });
  };

  const showEditPasswordModal = () => {
    setIsEditPasswordModalVisible(true);
    passwordForm.resetFields();
  };

  const handleUpdateFirstName = async (values) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/update-profile`,
        { firstName: values.firstName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success(t('messages.updateFirstNameSuccess'));
        setUser((prevUser) => ({
          ...prevUser,
          name: values.firstName,
        }));
        setIsEditFirstNameModalVisible(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du prénom :", error);
      message.error(
        error.response?.data?.message || t('messages.updateFirstNameError')
      );
    }
  };

  const handleUpdateLastName = async (values) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/update-profile`,
        { lastName: values.lastName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success(t('messages.updateLastNameSuccess'));
        setUser((prevUser) => ({
          ...prevUser,
          surname: values.lastName,
        }));
        setIsEditLastNameModalVisible(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom :", error);
      message.error(
        error.response?.data?.message || t('messages.updateLastNameError')
      );
    }
  };

  const handleUpdatePassword = async (values) => {
    if (!values.currentPassword || !values.newPassword) {
      message.error(t('messages.fillAllFields'));
      return;
    }
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/update-profile`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success(t('messages.updatePasswordSuccess'));
        setIsEditPasswordModalVisible(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mot de passe :", error);
      message.error(
        error.response?.data?.message || t('messages.updatePasswordError')
      );
    }
  };

  const handleLogout = async () => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/logout`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      localStorage.removeItem("token");
      setUser(null);
      message.success(t('messages.logoutSuccess'));
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      message.error(t('messages.logoutError'));
    }
  };

  const showLogoutModal = () => {
    setIsLogoutModalVisible(true);
  };

  const handleCancelLogout = () => {
    setIsLogoutModalVisible(false);
  };

  const confirmLogout = () => {
    setIsLogoutModalVisible(false);
    handleLogout();
  };

  const showServiceLogoutModal = (service) => {
    setSelectedService(service);
    setIsServiceLogoutModalVisible(true);
  };

  const confirmServiceLogout = async () => {
    const service = selectedService;
    setIsServiceLogoutModalVisible(false);
    try {
      const serviceNameLowercase = service.toLowerCase();
      await axios.delete(
        `${process.env.REACT_APP_URL_SERVER}/serviceRoutes/services-authentication/logout-${serviceNameLowercase}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(`${t('messages.disconnectedFrom')} ${service}`);
      setApiSettings((prev) => ({ ...prev, [service]: false }));
    } catch (error) {
      console.error(`Erreur lors de la déconnexion de ${service}:`, error);
      message.error(`${t('messages.disconnectError')} ${service}`);
    }
  };

  const handleDeleteSubscription = async (service) => {
    setSelectedService(service);
    setIsDeleteSubscriptionModalVisible(true);
  };

  const confirmDeleteSubscription = async () => {
    const service = selectedService;
    setIsDeleteSubscriptionModalVisible(false);
    try {
      const serviceNameForDB = getServiceNameForDatabase(service);
      const response = await axios.delete(
        `${process.env.REACT_APP_URL_SERVER}/subscriptionRoutes/subscription-management/delete-subscription/${serviceNameForDB}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        message.success(`${t('messages.unsubscribedFrom')} ${serviceNameForDB}`);
        setApiSettings((prev) => ({ ...prev, [service]: false }));
      }
    } catch (error) {
      message.error(`${t('messages.unsubscribeError')} ${service}`);
    }
  };

  const handleCreateSubscription = async (service) => {
    if (!token) {
      message.error(t('messages.pleaseLoginFirst'));
      return;
    }

    try {
      const serviceNameForDB = getServiceNameForDatabase(service);
      if (Array.isArray(serviceNameForDB)) {
        for (const individualService of serviceNameForDB) {
          const response = await axios.post(
            `${process.env.REACT_APP_URL_SERVER}/subscriptionRoutes/subscription-management/create-subscription/${individualService}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.data.success) {
            message.success(`${t('messages.subscribedTo')} ${individualService}`);
            setApiSettings((prev) => ({ ...prev, [service]: true }));
          }
        }
      } else {
        const response = await axios.post(
          `${process.env.REACT_APP_URL_SERVER}/subscriptionRoutes/subscription-management/create-subscription/${serviceNameForDB}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          message.success(`${t('messages.subscribedTo')} ${serviceNameForDB}`);
          setApiSettings((prev) => ({ ...prev, [service]: true }));
        }
      }
    } catch (error) {
      console.error(
        "Error during subscription:",
        error.response?.data || error.message
      );
      message.error(`${t('messages.subscribeError')} ${service}`);
    }
  };

  const authenticateWithService = (service) => {
    if (!token) {
      message.error(t('messages.pleaseLoginFirst'));
      return;
    }
    const redirectUrl = `${process.env.REACT_APP_URL_STK}/profile`;
    window.location.assign(
      `${process.env.REACT_APP_URL_SERVER}/serviceRoutes/services-authentication/${service.toLowerCase()}?redirectUrl=${redirectUrl}&token=${token}&source=web`
    );
  };

  if (isLoading) {
    return <div>{t('messages.loading')}</div>;
  }

  return (
    <AppLayout>
      <Content style={{ padding: "0 50px" }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title={t('profile.title')} bordered={false}>
              {user ? (
                <Space direction="vertical">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Text strong>
                      {t('profile.surname')}: {user.surname}
                    </Text>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={showEditLastNameModal}
                      style={{ marginLeft: 8 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Text strong>
                      {t('profile.name')}: {user.name}
                    </Text>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={showEditFirstNameModal}
                      style={{ marginLeft: 8 }}
                    />
                  </div>
                  <Text strong>
                    {t('profile.email')}: {user.email}
                  </Text>
                  <Button
                    onClick={showEditPasswordModal}
                    type="default"
                    style={{ marginTop: 10 }}
                  >
                    {t('profile.editPassword')}
                  </Button>
                  <Button
                    onClick={showLogoutModal}
                    type="primary"
                    style={{ marginTop: 10 }}
                  >
                    {t('profile.logout')}
                  </Button>
                </Space>
              ) : (
                <Text>{t('profile.pleaseLogin')}</Text>
              )}
            </Card>
          </Col>
          <Col span={24}>
            <Card title={t('services.title')} bordered={false}>
              <Space direction="vertical" style={{ width: "100%" }}>
                {AVAILABLE_SERVICES.map((service) => (
                  <Row
                    key={service.name}
                    justify="space-between"
                    align="middle"
                  >
                    <Col>
                      <img
                        src={service.image}
                        alt={`${service.name} logo`}
                        style={{ width: 50, marginRight: 10 }}
                      />
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          onClick={() => authenticateWithService(service.name)}
                          disabled={apiSettings[service.name]}
                        >
                          {t('services.connect')}
                        </Button>
                        <Button
                          onClick={() => handleCreateSubscription(service.name)}
                          disabled={apiSettings[service.name]}
                        >
                          {t('services.subscribe')}
                        </Button>
                        <Button
                          onClick={() => handleDeleteSubscription(service.name)}
                          disabled={!apiSettings[service.name]}
                        >
                          {t('services.unsubscribe')}
                        </Button>
                        <Button
                          onClick={() => showServiceLogoutModal(service.name)}
                          disabled={!apiSettings[service.name]}
                          type={apiSettings[service.name] ? "primary" : "default"}
                        >
                          {t('services.disconnect')}
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Modale pour modifier le prénom */}
        <Modal
          title={t('modals.editFirstName.title')}
          visible={isEditFirstNameModalVisible}
          onCancel={() => setIsEditFirstNameModalVisible(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setIsEditFirstNameModalVisible(false)}
            >
              {t('modals.editFirstName.cancel')}
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={() => firstNameForm.submit()}
            >
              {t('modals.editFirstName.save')}
            </Button>,
          ]}
        >
          <p style={{ color: 'blue' }}>
            {t('modals.editFirstName.message')}
          </p>
          <Form
            form={firstNameForm}
            layout="vertical"
            onFinish={handleUpdateFirstName}
          >
            <Form.Item
              name="firstName"
              label={t('modals.editFirstName.firstName')}
              rules={[
                {
                  required: true,
                  message: t('modals.editFirstName.firstNameRequired'),
                },
              ]}
            >
              <Input placeholder={t('modals.editFirstName.placeholder')} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modale pour modifier le nom */}
        <Modal
          title={t('modals.editLastName.title')}
          visible={isEditLastNameModalVisible}
          onCancel={() => setIsEditLastNameModalVisible(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setIsEditLastNameModalVisible(false)}
            >
              {t('modals.editLastName.cancel')}
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={() => lastNameForm.submit()}
            >
              {t('modals.editLastName.save')}
            </Button>,
          ]}
        >
          <p style={{ color: 'blue' }}>
            {t('modals.editLastName.message')}
          </p>
          <Form
            form={lastNameForm}
            layout="vertical"
            onFinish={handleUpdateLastName}
          >
            <Form.Item
              name="lastName"
              label={t('modals.editLastName.lastName')}
              rules={[
                {
                  required: true,
                  message: t('modals.editLastName.lastNameRequired'),
                },
              ]}
            >
              <Input placeholder={t('modals.editLastName.placeholder')} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modale pour modifier le mot de passe */}
        <Modal
          title={t('modals.editPassword.title')}
          visible={isEditPasswordModalVisible}
          onCancel={() => setIsEditPasswordModalVisible(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setIsEditPasswordModalVisible(false)}
            >
              {t('modals.editPassword.cancel')}
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={() => passwordForm.submit()}
            >
              {t('modals.editPassword.save')}
            </Button>,
          ]}
        >
          <p style={{ color: 'blue' }}>
            {t('modals.editPassword.message')}
          </p>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleUpdatePassword}
          >
            <Form.Item
              name="currentPassword"
              label={t('modals.editPassword.currentPassword')}
              rules={[
                {
                  required: true,
                  message: t('modals.editPassword.currentPasswordRequired'),
                },
              ]}
            >
              <Input.Password placeholder={t('modals.editPassword.placeholderCurrent')} />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label={t('modals.editPassword.newPassword')}
              rules={[
                {
                  required: true,
                  message: t('modals.editPassword.newPasswordRequired'),
                },
              ]}
            >
              <Input.Password placeholder={t('modals.editPassword.placeholderNew')} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modales de confirmation */}
        <Modal
          title={t('modals.logout.title')}
          visible={isLogoutModalVisible}
          onOk={confirmLogout}
          onCancel={handleCancelLogout}
          okText={t('modals.logout.confirm')}
          cancelText={t('modals.logout.cancel')}
        >
          <p>{t('modals.logout.message')}</p>
        </Modal>
        <Modal
          title={`${t('modals.serviceLogout.title')} ${selectedService}`}
          visible={isServiceLogoutModalVisible}
          onOk={confirmServiceLogout}
          onCancel={() => setIsServiceLogoutModalVisible(false)}
          okText={t('modals.serviceLogout.confirm')}
          cancelText={t('modals.serviceLogout.cancel')}
        >
          <p>
            {t('modals.serviceLogout.message', { service: selectedService })}
          </p>
        </Modal>
        <Modal
          title={`${t('modals.unsubscribe.title')} ${selectedService}`}
          visible={isDeleteSubscriptionModalVisible}
          onOk={confirmDeleteSubscription}
          onCancel={() => setIsDeleteSubscriptionModalVisible(false)}
          okText={t('modals.unsubscribe.confirm')}
          cancelText={t('modals.unsubscribe.cancel')}
        >
          <p>
            {t('modals.unsubscribe.message', { service: selectedService })}
          </p>
        </Modal>
      </Content>
    </AppLayout>
  );
};

export default ProfilePage;
