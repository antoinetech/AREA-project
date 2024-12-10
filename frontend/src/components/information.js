import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import AppLayout from "./AppLayout";

// Importation des logos des services
import microsoftLogo from "../assets/microsoft.webp";
import githubLogo from "../assets/github.png";
import spotifyLogo from "../assets/spotify.webp";
import discordLogo from "../assets/Discord_Logo.png";
import miroLogo from "../assets/miro.png";
import twitterLogo from "../assets/twitter.webp";
import twitchLogo from "../assets/twitch.webp";

import { useTranslation } from 'react-i18next';

const Information = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-4xl font-bold mb-6">{t('information.title')}</h1>
        <p className="text-lg leading-7 mb-4">
          {t('information.description')}
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">{t('information.mainFeaturesTitle')}</h2>
        <ul className="list-disc list-inside mb-4">
          <li>
            <strong>{t('information.features.actions.title')}:</strong> {t('information.features.actions.description')}
          </li>
          <li>
            <strong>{t('information.features.reactions.title')}:</strong> {t('information.features.reactions.description')}
          </li>
          <li>
            <strong>{t('information.features.customAutomation.title')}:</strong> {t('information.features.customAutomation.description')}
          </li>
        </ul>

        {/* Nouvelle section pour les actions et réactions */}
        <h2 className="text-2xl font-semibold mt-6 mb-4">{t('information.availableActionsReactionsTitle')}</h2>
        <div className="space-y-8">
          {/* Outlook */}
          <div className="flex items-center space-x-4">
            <img
              src={microsoftLogo}
              alt="Microsoft Outlook"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.outlook.name')}</h3>
              <p><strong>{t('information.actions')}:</strong> {t('information.services.outlook.actions')}</p>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.outlook.reactions')}</p>
            </div>
          </div>

          {/* GitHub */}
          <div className="flex items-center space-x-4">
            <img
              src={githubLogo}
              alt="GitHub"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.github.name')}</h3>
              <p><strong>{t('information.actions')}:</strong> {t('information.services.github.actions')}</p>
            </div>
          </div>

          {/* Spotify */}
          <div className="flex items-center space-x-4">
            <img
              src={spotifyLogo}
              alt="Spotify"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.spotify.name')}</h3>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.spotify.reactions')}</p>
            </div>
          </div>

          {/* Discord */}
          <div className="flex items-center space-x-4">
            <img
              src={discordLogo}
              alt="Discord"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.discord.name')}</h3>
              <p><strong>{t('information.actions')}:</strong> {t('information.services.discord.actions')}</p>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.discord.reactions')}</p>
            </div>
          </div>

          {/* Miro */}
          <div className="flex items-center space-x-4">
            <img
              src={miroLogo}
              alt="Miro"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.miro.name')}</h3>
              <p><strong>{t('information.actions')}:</strong> {t('information.services.miro.actions')}</p>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.miro.reactions')}</p>
            </div>
          </div>

          {/* Microsoft Calendar */}
          <div className="flex items-center space-x-4">
            <img
              src={microsoftLogo}
              alt="Microsoft Calendar"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.microsoftCalendar.name')}</h3>
              <p><strong>{t('information.actions')}:</strong> {t('information.services.microsoftCalendar.actions')}</p>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.microsoftCalendar.reactions')}</p>
            </div>
          </div>

          {/* Twitch */}
          <div className="flex items-center space-x-4">
            <img
              src={twitchLogo}
              alt="Twitch"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.twitch.name')}</h3>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.twitch.reactions')}</p>
            </div>
          </div>

          {/* Twitter */}
          <div className="flex items-center space-x-4">
            <img
              src={twitterLogo}
              alt="Twitter"
              className="w-12 h-auto"
            />
            <div>
              <h3 className="text-xl font-semibold">{t('information.services.twitter.name')}</h3>
              <p><strong>{t('information.reactions')}:</strong> {t('information.services.twitter.reactions')}</p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-4">{t('information.whyUseAreaTitle')}</h2>
        <p className="text-lg leading-7 mb-4">
          {t('information.whyUseAreaDescription')}
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">{t('information.examplesTitle')}</h2>
        <ul className="list-disc list-inside mb-4">
          <li>
            {t('information.examples.example1')}
          </li>
          <li>
            {t('information.examples.example2')}
          </li>
          <li>
            {t('information.examples.example3')}
          </li>
        </ul>
        <h2 className="text-2xl font-semibold mt-6 mb-4">{t('information.howToStartTitle')}</h2>
        <p className="text-lg leading-7 mb-4">
          {t('information.howToStartDescription')}
        </p>
        <div className="mt-8">
          <Button
            type="primary"
            className="bg-indigo-500 text-white px-6 py-3 rounded hover:bg-indigo-600"
            onClick={() => navigate('/create-area')}
          >
            {t('information.createAreaNowButton')}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Information;
