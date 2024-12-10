import React, { useState, useEffect } from "react";
import { Select, Button, Form, Input, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const CreateArea = () => {
  const [allServices, setAllServices] = useState([]);
  const [connectedServices, setConnectedServices] = useState([]);
  const [selectedActionService, setSelectedActionService] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedReactions, setSelectedReactions] = useState([]);
  const [actionParams, setActionParams] = useState({});
  const [reactionParams, setReactionParams] = useState({});
  const [availableActionParams, setAvailableActionParams] = useState([]);
  const [availableReactionParams, setAvailableReactionParams] = useState({});
  const token = localStorage.getItem("token");

  const navigate = useNavigate();
  const { t } = useTranslation(); // Utilisation de useTranslation

  const fetchAllServices = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/serviceRoutes/services-informations/services-list`
      );
      setAllServices(response.data || []);
    } catch (error) {
      message.error(t('messages.fetchServicesError'));
    }
  };

  const fetchConnectedServices = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const connectedSubscriptions = response.data || [];
      const filteredServices = allServices.filter((service) =>
        connectedSubscriptions.some(
          (subscription) => subscription.serviceId.name === service.name
        )
      );
      setConnectedServices(filteredServices);
    } catch (error) {
      message.error(t('messages.fetchConnectedServicesError'));
    }
  };

  useEffect(() => {
    fetchAllServices();
  }, []);

  useEffect(() => {
    if (allServices.length > 0) {
      fetchConnectedServices();
    }
  }, [allServices]);

  const handleActionServiceChange = (value) => {
    setSelectedActionService(value);
    setSelectedAction(null);
    setActionParams({});
    setAvailableActionParams([]); // Réinitialiser les paramètres disponibles lors du changement de service
  };

  const handleActionChange = (value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedActionService
    );
    const selectedAction = selectedService?.actions.find(
      (action) => action.name === value
    );
    setSelectedAction(value);
    setAvailableActionParams(selectedAction?.params || []);
    setActionParams({});
  };

  const handleReactionServiceChange = (index, value) => {
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = {
      ...updatedReactions[index],
      service: value,
      reaction: null,
    };
    setSelectedReactions(updatedReactions);
    setReactionParams((prev) => ({
      ...prev,
      [index]: {},
    }));
    setAvailableReactionParams((prev) => ({
      ...prev,
      [index]: [],
    }));
  };

  const handleReactionChange = (index, value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedReactions[index].service
    );
    const selectedReaction = selectedService?.reactions.find(
      (reaction) => reaction.name === value
    );
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = { ...updatedReactions[index], reaction: value };
    setSelectedReactions(updatedReactions);
    setAvailableReactionParams((prev) => ({
      ...prev,
      [index]: selectedReaction?.params || [],
    }));
    setReactionParams((prev) => ({
      ...prev,
      [index]: {},
    }));
  };

  const handleReactionParamChange = (index, paramName, value) => {
    setReactionParams((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [paramName]: value,
      },
    }));
  };

  const handleActionParamChange = (paramName, value) => {
    setActionParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleAddReaction = () => {
    setSelectedReactions([
      ...selectedReactions,
      { service: null, reaction: null },
    ]);
  };

  const handleRemoveReaction = (index) => {
    const updatedReactions = [...selectedReactions];
    updatedReactions.splice(index, 1); // Supprimer la réaction spécifiée
    setSelectedReactions(updatedReactions);

    // Supprimer les paramètres associés à la réaction supprimée
    setReactionParams((prev) => {
      const updatedParams = { ...prev };
      delete updatedParams[index];
      return updatedParams;
    });
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        name: values.areaName,
        ActionService: selectedActionService,
        Action: {
          name: selectedAction,
          params: actionParams,
        },
        Reactions: selectedReactions.map((reaction, index) => ({
          ReactionService: reaction.service,
          Reaction: reaction.reaction,
          params: reactionParams[index],
        })),
      };

      // Vérifier les données envoyées
      console.log(payload);

      const response = await axios.post(
        `${process.env.REACT_APP_URL_SERVER}/areaRoutes/createArea`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        message.success(t('messages.areaCreatedSuccess'));
        navigate("/Homepage");
      } else {
        message.error(t('messages.areaCreationFailed'));
      }
    } catch (error) {
      console.error(error);
      message.error(t('messages.areaCreationError'));
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">{t('createArea.title')}</h1>
        <Form onFinish={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 shadow rounded">
            <Form.Item
              name="areaName"
              label={t('createArea.areaName')}
              rules={[
                {
                  required: true,
                  message: t('createArea.areaNameRequired'),
                },
              ]}
            >
              <Input
                placeholder={t('createArea.areaNamePlaceholder')}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
              />
            </Form.Item>

            <Form.Item label={t('createArea.chooseActionService')}>
              <Select
                placeholder={t('createArea.selectService')}
                onChange={handleActionServiceChange}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
              >
                {connectedServices.map((service) => (
                  <Option key={service.name} value={service.name}>
                    {service.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedActionService && (
              <Form.Item label={t('createArea.chooseAction')}>
                <Select
                  placeholder={t('createArea.selectAction')}
                  onChange={handleActionChange}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                >
                  {connectedServices
                    .find((service) => service.name === selectedActionService)
                    ?.actions.map((action) => (
                      <Option key={action.name} value={action.name}>
                        {action.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            )}

            {availableActionParams.length > 0 &&
              availableActionParams.map((param) => (
                <Form.Item key={param} label={param}>
                  <Input
                    placeholder={t('createArea.enterParam', { param })}
                    onChange={(e) =>
                      handleActionParamChange(param, e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                  />
                </Form.Item>
              ))}

            {selectedReactions.map((reaction, index) => (
              <div key={index}>
                <Form.Item
                  label={t('createArea.chooseReactionService', {
                    index: index + 1,
                  })}
                >
                  <Select
                    placeholder={t('createArea.selectService')}
                    onChange={(value) =>
                      handleReactionServiceChange(index, value)
                    }
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                  >
                    {connectedServices.map((service) => (
                      <Option key={service.name} value={service.name}>
                        {service.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {reaction.service && (
                  <Form.Item
                    label={t('createArea.chooseReaction', {
                      service: reaction.service,
                    })}
                  >
                    <Select
                      placeholder={t('createArea.selectReaction')}
                      onChange={(value) =>
                        handleReactionChange(index, value)
                      }
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                    >
                      {connectedServices
                        .find(
                          (service) => service.name === reaction.service
                        )
                        ?.reactions.map((reactionOption) => (
                          <Option
                            key={reactionOption.name}
                            value={reactionOption.name}
                          >
                            {reactionOption.name}
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                )}

                {availableReactionParams[index] &&
                  availableReactionParams[index].map((param) => (
                    <Form.Item key={param} label={param}>
                      <Input
                        placeholder={t('createArea.enterParam', { param })}
                        onChange={(e) =>
                          handleReactionParamChange(
                            index,
                            param,
                            e.target.value
                          )
                        }
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                      />
                    </Form.Item>
                  ))}

                <Button
                  type="danger"
                  onClick={() => handleRemoveReaction(index)}
                  className="mt-2 mb-2 w-full p-3 text-white border-2 border-red-600 rounded-lg bg-red-600 hover:bg-red-700 hover:text-white transition duration-300 ease-in-out shadow-lg"
                >
                  {t('createArea.removeReaction')}
                </Button>
              </div>
            ))}

            <Button
              type="dashed"
              onClick={handleAddReaction}
              className="w-full p-3 text-indigo-500 border-2 border-indigo-500 rounded bg-indigo-300 hover:bg-indigo-500 hover:text-white"
            >
              {t('createArea.addReaction')}
            </Button>
          </div>

          <div>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              {t('createArea.createAreaButton')}
            </Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
};

export default CreateArea;
