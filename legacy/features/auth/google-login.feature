Feature: Google Login
  As a user
  I want to login with my Google account
  So that I can access my personalized Newledge dashboard

  Background:
    Given I am on the login page

  Scenario: User can see Google login button
    When I view the login page
    Then I should see a "使用 Google 登入" button
    And the button should have the Google logo
    And the button should be enabled

  Scenario: User can initiate Google OAuth flow
    When I click the "使用 Google 登入" button
    Then I should be redirected to Google OAuth page
    And the redirect should include the correct redirect URI

  Scenario: User successfully completes Google OAuth
    Given I am redirected back from Google OAuth
    When I provide valid OAuth code and state
    Then I should be authenticated
    And I should see my Google profile picture
    And I should see my Google account name
    And I should be redirected to the home page

  Scenario: User can logout after successful login
    Given I am logged in with Google
    When I click on my profile picture
    Then I should see a dropdown menu
    And I should see my name and email
    When I click "登出"
    Then I should be logged out
    And I should see the Google login button again

  Scenario: User profile displays correctly in navbar
    Given I am logged in with Google
    When I view the navbar
    Then I should see my profile picture
    And I should see my name
    When I click on my profile
    Then I should see my email address
    And I should see a logout option

  Scenario: Mobile responsive login flow
    Given I am on a mobile device
    When I view the login page
    Then I should see the Google login button
    And the button should be properly sized for mobile
    When I click the login button
    Then I should be redirected to Google OAuth

  Scenario: Error handling for failed OAuth
    Given I am redirected back from Google OAuth with invalid code
    When the OAuth process fails
    Then I should see an error message
    And I should have the option to return to home page
    And I should see the Google login button again
