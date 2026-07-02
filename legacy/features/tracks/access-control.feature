Feature: Tracks access control and navigation
  As a visitor
  I should not be able to access tracks without login
  And I should not see tracks navigation entry when not logged in

  Scenario: Unauthenticated user is redirected from tracks page to home
    When user navigates to the tracks page directly
    Then user should be redirected to the home page

  Scenario: Unauthenticated user cannot see tracks navigation entry
    Given user is on the home page
    Then user should not see a navigation link to tracks


