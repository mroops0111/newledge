Feature: Track Management
  Track is the item that user want to track, it has the following attributes:
  * Domain: the knowledge domain, such as technology, software, medical, entertainment, etc.
  * Sources: the content sources, such as news, blog, etc.
  * Keywords: the keywords to search
  * Frequency: the frequency of tracking, which also represents the search interval and notification period

  As a user
  I want to set up and manage my tracks in a single place
  So that I can record my tracks to the backend and let it search and summarize the content for me  

  Background:
    Given user is on the track page

  Scenario: Track is created
    When user clicks on "Add New Track" button
    Then user should see a form to create a new track
    When user enters "AI Latest News" as the track name
    And User selects "Artificial Intelligence" as the domain
    And user adds the keyword "machine learning"
    And User adds the keyword "deep learning"
    And User selects "News" as the source
    And User clicks "Save" button
    Then User should see "AI Latest News" in his tracks list
    And the system should record the track to the backend
    And user should see a success message

  Scenario: Track is updated
    Given user has a track "AI Latest News"
    When user clicks on the edit button for "AI Latest News"
    Then user should see the edit form with current settings
    When user adds the keyword "neural networks"
    And user clicks "Save" button
    Then user should see the updated track in his tracks list
    And the system should update the track to the backend
    And user should see a success message

  Scenario: Track is deleted
    Given user has a track "AI Latest News"
    When user clicks on the delete button for "AI Latest News"
    Then user should see a confirmation dialog
    When user confirms the deletion
    Then "AI Latest News" should be removed from his tracks list
    And the system should delete the track from the backend
    And user should see a success message 
